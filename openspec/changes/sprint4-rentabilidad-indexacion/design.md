# Design: Sprint 4 — Calculadora de Rentabilidad por Lote & Indexación a Cereal

## 1. Enfoque

Cinco **hexágonos nuevos** bajo `packages/backend/src/entities/` —`valuation`, `tariff`, `expense-category`, `expense` y `profitability`— más **un único cambio** a un hexágono existente: `daily-report` gana un puerto de gancho post-aprobación. A diferencia de Sprint 3 (integraciones sin persistencia), estos módulos **sí son entidades persistentes** (modelos Prisma propios), por lo que viven en `entities/` y siguen el layout de `docs/hexagonal-conventions.md` (`domain/` · `application/{dto,ports,use-cases}` · `adapters/{inbound,outbound}` · `<modulo>.module.ts`).

El núcleo es el módulo **`valuation`**: define el objeto de valor `Money`, la **política única de tasa** y los casos de uso que convierten cualquier monto a ARS y valorizan partes. Los demás módulos lo consumen **solo por puertos propios** cuyo adapter llama a un caso de uso exportado de `valuation` (mismo patrón de T4: puerto consumidor + adapter). `valuation` a su vez consume `GetGrainPricesUseCase` y `GetUsdOfficialUseCase` del Sprint 3 por un puerto `MarketPricePort`; nunca los inyecta en dominio.

Mapa de unidades de trabajo (ver `tasks.md`):

| Unidad | Módulos | Riesgo alto (Task Size) |
|---|---|---|
| 1 Tarifario + indexación | `valuation` (núcleo), `tariff` | **Migración** (tabla `Tariff` + enums), **permisos** (ADMIN-only) |
| 2 Valorización de partes | `valuation` (snapshot/retry/hoy), cambio en `daily-report` | **Migración**, **concurrencia** (reintentos), **cambio del `approve` existente** |
| 3 Gastos manuales | `expense-category`, `expense` | **Migración**, **permisos** (flujo ADMIN/SUPERVISOR), **concurrencia** (sugerencia única) |
| 4 Calculadora | `profitability` | **Permisos** (ADMIN-only) |

## 2. Decisiones de arquitectura

### 2.1 Dinero: `Decimal` en BD, strings en el borde, aritmética exacta en dominio (T1)

El esquema usa `Float` para todo el dinero (hoy `MachineActivity.cost`; 0 campos `Decimal`). Para montos nuevos se usa `Decimal`:

| Opción | Tradeoff | Decisión |
|---|---|---|
| `Float` como el resto del esquema | consistente; error de binario en sumas y multiplicaciones (kg × ARS/tn) | **No** — los márgenes suman miles de operaciones |
| `Decimal` en BD + `number` en dominio | simple | **No** — reintroduce el error al operar |
| `Decimal` en BD + aritmética exacta propia en dominio sobre `BigInt` escalado | cero dependencias nuevas; hay que escribir y testear unas pocas operaciones | **Sí** |
| Agregar `decimal.js` como dependencia directa | API completa | **No** — es dependencia transitiva de Prisma pero sumarla directa choca con "no new dependency unless there is a concrete need"; las operaciones necesarias son `add`, `mul`, `div` y redondeo |

Reglas:

- Columnas: `Decimal(18,4)` para todo monto persistido (cantidades, precios nativos y resultados en ARS); el **redondeo a 2 decimales (mitad hacia arriba)** se aplica en el dominio al calcular los resultados en ARS (**Supuesto**, ver Preguntas abiertas).
- `domain/decimal.ts` (en `valuation`): tipo `Dec` inmutable sobre `BigInt` con escala fija interna, `Dec.parse(string)`, `add`, `sub`, `mul`, `div`, `roundHalfUp(places)` y `toString()`. Sin imports de Prisma.
- Los **adapters outbound** convierten `Prisma.Decimal` ↔ `string`. Los `Float` de entrada (`DailyReport.hectares`, `DailyReport.hours`, `Lot.area`) se convierten con `Dec.parse(String(value))` redondeado a 4 decimales.
- **Wire**: los montos viajan como **strings decimales** (`"186000.00"`), nunca como `number`, para no perder exactitud; la web los parsea solo para mostrar (`format.ts`).

### 2.2 Objeto de valor `Money` y política única de tasa (T2)

```ts
// valuation/domain/money.ts
export type MoneyUnit = 'ARS' | 'USD' | 'KG_CEREAL';
export type Grain = 'TRIGO' | 'MAIZ' | 'GIRASOL' | 'SOJA' | 'SORGO';
export type Money = { amount: Dec; unit: MoneyUnit; grain: Grain | null }; // grain != null  <=>  unit === 'KG_CEREAL'
export function assertValidMoney(m: Money): void; // grano obligatorio en kg; prohibido en otro caso; monto >= 0
```

```ts
// valuation/domain/valuation-rate-policy.ts
export type UsdRateType = 'OFICIAL_VENTA' | 'OFICIAL_COMPRA' | 'BNA_PIZARRA';
export const VALUATION_USD_RATE_TYPE: UsdRateType = 'OFICIAL_VENTA'; // D5: único punto a cambiar
```

| Opción | Tradeoff | Decisión |
|---|---|---|
| Tipo de tasa como constante única + `rateType` persistido en cada valorización | cambiar la política es una línea; los snapshots viejos quedan trazables | **Sí** (D5, T2) |
| Tasa configurable por firma/env | flexible | **No** — el usuario no lo pidió; agrega superficie de configuración |
| Hardcodear `venta` en cada cálculo | trivial | **No** — convierte el cambio probable en una cacería |

`MarketPricePort` entrega el dato crudo; la **política decide qué campo usar**:

```ts
// valuation/application/ports/market-price.port.ts
export const MARKET_PRICE = Symbol('MARKET_PRICE');
export type MarketSnapshot = {
  grainArsPerTon: Partial<Record<Grain, Dec | null>>;      // null = "S/C"
  usd: { oficialVenta: Dec; oficialCompra: Dec; bnaPizarra: Dec | null } | null; // null = proveedor no disponible
  sources: { grains: string; usd: string };                 // 'cac.bcr.com.ar' | 'dolarapi.com'
  fetchedAt: { grains: Date | null; usd: Date | null };
  stale: { grains: boolean; usd: boolean };
};
export interface MarketPricePort { getSnapshot(need: { grains: Grain[]; usd: boolean }): Promise<MarketSnapshot>; }
```

El adapter (`integrations-market-price.adapter.ts`, outbound de `valuation`) inyecta `GetGrainPricesUseCase` y `GetUsdOfficialUseCase` (exportados; los tokens de puerto **no** lo están) y consulta **solo lo que se necesita** (`need`). Un error `Upstream*` de un componente produce `null` en ese componente (no relanza): la decisión "sin valorizar" es del caso de uso. **D26:** se acepta un precio `stale: true` (cache vencido tras fallo del proveedor) para valorizar, registrando `priceFetchedAt` y `stale`.

### 2.3 Modelo de datos (T9)

Enums nuevos: `MoneyUnit { ARS USD KG_CEREAL }`, `Grain { TRIGO MAIZ GIRASOL SOJA SORGO }`, `TariffBasis { POR_HECTAREA POR_HORA }`, `UsdRateType { OFICIAL_VENTA OFICIAL_COMPRA BNA_PIZARRA }`, `ValuationOrigin { APROBACION REINTENTO }`, `ExpenseSuggestionKind { EDICION BAJA }`, `ExpenseSuggestionStatus { PENDIENTE APROBADA RECHAZADA }`.

```prisma
model Tariff {
  id            String      @id @default(uuid())
  companyId     String
  laborTypeId   String
  priceAmount   Decimal     @db.Decimal(18, 4)
  priceUnit     MoneyUnit
  priceGrain    Grain?
  priceBasis    TariffBasis
  costAmount    Decimal     @db.Decimal(18, 4)
  costUnit      MoneyUnit
  costGrain     Grain?
  costBasis     TariffBasis
  updatedBy     String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  company   Company   @relation(fields: [companyId], references: [id])
  laborType LaborType @relation(fields: [laborTypeId], references: [id])

  @@unique([companyId, laborTypeId])   // D3: una tarifa por par
}

model DailyReportValuation {
  id            String       @id @default(uuid())
  dailyReportId String       @unique       // T3: una valorización por parte
  companyId     String                      // desnormalizado (aislamiento R033 y agregados)
  lotId         String                      // desnormalizado (agregados por lote)
  tariffId      String?                     // SetNull si se borra la tarifa; el snapshot ya copió todo
  origin        ValuationOrigin             // REINTENTO = valorización tardía (D8)
  // Lo aplicado (copia de la tarifa al momento de valorizar)
  priceAmount   Decimal @db.Decimal(18, 4)
  priceUnit     MoneyUnit
  priceGrain    Grain?
  priceBasis    TariffBasis
  costAmount    Decimal @db.Decimal(18, 4)
  costUnit      MoneyUnit
  costGrain     Grain?
  costBasis     TariffBasis
  // Cantidades del parte y cantidades pactadas en unidad original
  hectares      Decimal @db.Decimal(18, 4)
  hours         Decimal @db.Decimal(18, 4)
  incomeNative  Decimal @db.Decimal(18, 4)  // en priceUnit (kg, USD o ARS)
  costNative    Decimal @db.Decimal(18, 4)  // en costUnit
  // Precios/tasa usados (null si no se necesitaron)
  incomeGrainArsPerTon Decimal? @db.Decimal(18, 4)
  costGrainArsPerTon   Decimal? @db.Decimal(18, 4)
  usdRate       Decimal? @db.Decimal(18, 4)
  usdRateType   UsdRateType?
  grainSource   String?
  usdSource     String?
  priceFetchedAt DateTime?
  priceStale    Boolean  @default(false)
  // Resultados en ARS
  incomeArs     Decimal @db.Decimal(18, 4)
  costArs       Decimal @db.Decimal(18, 4)
  valuedAt      DateTime                     // fecha de valorización (precios del día)
  createdAt     DateTime @default(now())

  dailyReport DailyReport @relation(fields: [dailyReportId], references: [id])
  tariff      Tariff?     @relation(fields: [tariffId], references: [id], onDelete: SetNull)

  @@index([companyId, lotId])
}

model ExpenseCategory {            // copia InputCategory (schema ~164)
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  expenses  Expense[]
  @@unique([tenantId, name])
  @@index([tenantId])
}

model Expense {
  id          String   @id @default(uuid())
  companyId   String
  lotId       String
  categoryId  String
  date        DateTime
  description String
  amount      Decimal  @db.Decimal(18, 4)
  unit        MoneyUnit
  grain       Grain?
  grainArsPerTon Decimal? @db.Decimal(18, 4)
  usdRate     Decimal? @db.Decimal(18, 4)
  usdRateType UsdRateType?
  priceSource String?
  priceFetchedAt DateTime?
  priceStale  Boolean  @default(false)     // D26: valorizado con precio stale de la cache
  amountArs   Decimal  @db.Decimal(18, 4)
  valuedAt    DateTime
  createdBy   String
  updatedBy   String
  deletedAt   DateTime?                    // baja lógica: sale de listados y de la calculadora
  deletedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  company  Company         @relation(fields: [companyId], references: [id])
  lot      Lot             @relation(fields: [lotId], references: [id])
  category ExpenseCategory @relation(fields: [categoryId], references: [id])
  suggestions ExpenseSuggestion[]
  @@index([companyId, lotId, date])
}

model ExpenseSuggestion {
  id              String                  @id @default(uuid())
  expenseId       String
  companyId       String
  kind            ExpenseSuggestionKind
  status          ExpenseSuggestionStatus @default(PENDIENTE)
  // Valores propuestos (solo EDICION; todos opcionales = "sin cambio")
  proposedLotId       String?
  proposedCategoryId  String?
  proposedDate        DateTime?
  proposedDescription String?
  proposedAmount      Decimal? @db.Decimal(18, 4)
  proposedUnit        MoneyUnit?
  proposedGrain       Grain?
  suggestedBy     String
  rejectionReason String?
  resolvedBy      String?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  expense Expense @relation(fields: [expenseId], references: [id])   // sin cascada: el gasto se da de baja lógica
  @@index([companyId, status])
  @@index([suggestedBy])
}
```

Notas de modelado:

- **Tabla de snapshot ancha, sin JSON**: cada campo aplicado es columna para poder agregar en SQL por lote/rango y revalorizar a hoy sin parsear.
- **Baja lógica de `Expense`** (`deletedAt`/`deletedBy`), en línea con el flag `deleted` de `LaborType` e `InputCategory`. Tanto el borrado directo del ADMIN como la aprobación de una `BAJA` marcan el gasto, que deja de aparecer en listados y en la calculadora. Las sugerencias conservan su historial: así el SUPERVISOR ve su sugerencia de baja como `APROBADA` (D23, spec R-FIN-11). Un `onDelete: Cascade` borraría justamente la sugerencia aprobada y contradiría D23.
- **Índice único parcial** (Prisma no puede expresarlo; va en el SQL de la migración): `CREATE UNIQUE INDEX "ExpenseSuggestion_one_pending_per_expense" ON "ExpenseSuggestion"("expenseId") WHERE "status" = 'PENDIENTE';` — garantiza "una sugerencia pendiente por gasto" aunque dos requests compitan (D23).
- `CHECK` en SQL: `("priceUnit" = 'KG_CEREAL') = ("priceGrain" IS NOT NULL)` (idem costo y gasto), y montos `>= 0`.
- El 0 es válido en `priceAmount`/`costAmount` (D12).

### 2.4 Algoritmo de valorización de un parte (`valuation`)

```text
valuate(report, tariff, now, origin):
  if tariff == null            -> SIN_TARIFA
  qtyPrice = tariff.priceBasis == POR_HECTAREA ? report.hectares : report.hours
  qtyCost  = tariff.costBasis  == POR_HECTAREA ? report.hectares : report.hours
  incomeNative = tariff.priceAmount * qtyPrice          # en priceUnit
  costNative   = tariff.costAmount  * qtyCost           # en costUnit
  need = grains/usd requeridos por priceUnit/costUnit
  market = MarketPricePort.getSnapshot(need)
  incomeArs = toArs(incomeNative, priceUnit, priceGrain, market, policy)   # null si falta dato
  costArs   = toArs(costNative,   costUnit,  costGrain,  market, policy)
  if incomeArs == null or costArs == null -> PRECIO_NO_DISPONIBLE          # todo o nada
  persist snapshot (saveIfAbsent)
```

`toArs`: `ARS` → monto; `USD` → `monto × tasa` con la tasa que dicta la política; `KG_CEREAL` → `monto × precioArsPorTon / 1000`. Redondeo a 2 decimales (mitad hacia arriba) al final. Una tarifa solo en ARS no pide nada al mercado.

`valuation/domain/valuation.rules.ts` contiene `computeValuation` y `toArs` como **funciones puras** (sin mocks, patrón `daily-report.rules.spec.ts`); los casos de uso solo orquestan puertos.

### 2.5 Gancho post-aprobación (T6) — **cambio a código existente (alto riesgo)**

`ApproveDailyReportUseCase` (hoy 4 dependencias, `approve-daily-report.use-case.ts`) llama a `approval.approveWithStockDeduction(...)`, que es la transacción de R017. Se agrega un **quinto puerto**:

```ts
// daily-report/application/daily-report.ports.ts  (los puertos del módulo viven en este archivo)
export const DAILY_REPORT_VALUATION_HOOK = Symbol('DAILY_REPORT_VALUATION_HOOK');
export interface DailyReportValuationHookPort {
  /** Contrato: NO lanza. Llamado después de que la aprobación se confirmó. */
  onApproved(input: { companyId: string; reportId: string; approvedAt: Date }): Promise<void>;
}
```

```ts
const approved = await this.approval.approveWithStockDeduction({ ... });   // transacción R017, ya confirmada
try {
  await this.valuationHook.onApproved({ companyId: company, reportId: approved.id, approvedAt: approved.approvedAt ?? now });
} catch {
  // el contrato dice que no lanza; esto protege contra implementaciones que lo violen
}
return approved;                                                           // misma respuesta que antes
```

| Opción | Tradeoff | Decisión |
|---|---|---|
| Hook **awaited después del commit**, con try/catch | determinista y testeable; la respuesta espera una consulta de precios (cacheada casi siempre) | **Sí** |
| Dentro de `approveWithStockDeduction` (misma transacción) | atomicidad | **No** — D7: la valorización no puede revertir una aprobación ni alargar una transacción con I/O externo |
| Fire-and-forget (`void`) | no agrega latencia | **No** — fallos invisibles y carrera con un reintento inmediato; difícil de testear |
| Evento de dominio / bus | desacopla | **No** — no hay infraestructura de eventos; sería una abstracción especulativa |

El adapter `ValuationDailyReportHookAdapter` (`daily-report/adapters/outbound/`) llama a `ValuateDailyReportUseCase` (exportado por `ValuationModule`), **captura y loguea** cualquier error (`Logger` de Nest, solo en adapter) y devuelve. `DailyReportModule` pasa a importar `ValuationModule`; `ValuationModule` **no** importa `DailyReportModule` (lee partes por su propio `DailyReportReaderPort` Prisma), así que no hay ciclo. El contrato HTTP de `POST /daily-reports/:id/approve` no cambia. Los tests existentes del caso de uso (4 argumentos) se actualizan para pasar un fake del gancho.

### 2.6 Reintento de valorizaciones e idempotencia (T3)

`RetryPendingValuationsUseCase.execute({ companyId, laborTypeId?, limit })`:

1. `DailyReportReaderPort.findApprovedWithoutValuation({ companyId, laborTypeId?, limit })` → partes `APROBADO` sin fila en `DailyReportValuation` (`NOT EXISTS`), orden por fecha, `limit` (**Supuesto**: 200 por invocación).
2. Para cada parte: `valuate(..., origin: REINTENTO)`.
3. `ValuationRepositoryPort.saveIfAbsent` hace `INSERT` y trata el conflicto de `dailyReportId` (código `P2002` de Prisma, traducido **dentro del adapter**) como `'ALREADY_EXISTS'`: no es error. Dos reintentos concurrentes terminan con **una** fila.

Disparadores (sin scheduler): al **guardar/actualizar una tarifa** (`tariff` llama por su puerto `PendingValuationRetryPort` → `RetryPendingValuationsUseCase` con `companyId` + `laborTypeId`) y al **abrir la calculadora** (`profitability`, con `companyId`). Ambos son best-effort: sus errores se registran y no cambian la respuesta del guardado/lectura. El resumen de pendientes (`count` y suma de hectáreas) se calcula **después** del reintento con una consulta sin `limit`.

### 2.7 Valor a hoy (`valuation`)

El snapshot guarda `incomeNative` y `costNative` en su unidad original. `revalueToday(snapshot, market)` = `toArs(native, unit, grain, market, policy)` con el `MarketSnapshot` de **hoy**; los `ARS` pasan sin cambio (sin inflación). Los gastos igual con `amount/unit/grain`. La calculadora pide **un solo** `MarketSnapshot` por request (todos los granos + USD). Si falta algún dato requerido por algún componente del rango, el modo `A_VALOR_HOY` responde **503** (`MarketUnavailableError`), sin mezclar valores. **D28:** el USD de "hoy" usa el tipo de tasa vigente de la política, no el que registró el snapshot: toda la columna comparte un criterio y sus totales son sumables.

### 2.8 Módulos y ubicación (T5)

| Módulo | Ruta | Responsabilidad | Justificación |
|---|---|---|---|
| `valuation` | `src/entities/valuation/` | `Money`, `Dec`, política, `MarketPricePort`, valorizar parte, reintentar, valor a hoy, valuar monto suelto | Núcleo compartido; poseer `DailyReportValuation` |
| `tariff` | `src/entities/tariff/` | CRUD de `Tariff` ADMIN-only, equivalentes en kg | Ciclo de vida propio; precedente `labor-type` |
| `expense-category` | `src/entities/expense-category/` | CRUD con 409 en uso | Copia `input-category` |
| `expense` | `src/entities/expense/` | `Expense` + `ExpenseSuggestion` | La sugerencia aplica cambios al gasto en una transacción; separarlos obligaría a coordinar dos hexágonos |
| `profitability` | `src/entities/profitability/` | Lectura de calculadora (lista + detalle) y métricas | Solo lectura; sin tablas propias |

Alternativas descartadas: un módulo único `finance` (mezcla ciclos de vida y permisos —el SUPERVISOR no debe ver `tariff` ni `profitability`—) y alojarlo en `integrations/` (no son clientes externos).

`valuation/domain` actúa como **shared kernel** de dinero: `tariff`, `expense` y `profitability` importan **tipos y funciones puras** de `valuation/domain` (permitido por la regla "application puede importar domain"), pero **no** sus adapters ni sus use cases: para casos de uso usan un puerto propio cuyo adapter llama al caso de uso exportado (`MoneyValuationPort` en `expense`/`tariff`, `MarketSnapshotPort` y `PendingValuationRetryPort` en `profitability`). `ValuationModule` exporta `ValueMoneyUseCase`, `GetMarketSnapshotUseCase`, `ValuateDailyReportUseCase` y `RetryPendingValuationsUseCase`.

Errores (`domain/errors.ts` por módulo, mapeados en el controller según la convención): `EntityNotFoundError`→404, `InvalidInputError`→400, `DuplicateEntityError`→409, `CategoryInUseError`→409 (precedente `input-category`), `PendingSuggestionError`→409, `SuggestionAlreadyResolvedError`→409, `MarketUnavailableError`→503. El 503 reutiliza el helper genérico del Sprint 3 (`translateIntegrationError`): mensaje genérico, detalle solo en log.

### 2.9 Gastos y sugerencias (`expense`)

Casos de uso (uno `execute` cada uno): `PreviewExpenseUseCase` (valúa sin persistir, para el resumen D24), `CreateExpenseUseCase`, `UpdateExpenseUseCase` (ADMIN), `DeleteExpenseUseCase` (ADMIN), `FindExpensesUseCase`, `CreateExpenseSuggestionUseCase`, `FindExpenseSuggestionsUseCase`, `ApproveExpenseSuggestionUseCase`, `RejectExpenseSuggestionUseCase`.

Reglas de dominio (`expense/domain/`): `assertPendingSuggestion(status)` (copia `assertPendingApproval` de `daily-report.rules.ts:43`), `requiresRevaluation(current, next)` (cambia `amount`, `unit` o `grain`), `assertNoPendingSuggestion`, validación de `Money` y fecha.

Puertos: `ExpenseRepositoryPort`, `ExpenseSuggestionRepositoryPort`, `LotReaderPort` (lote **dentro del tenant** del caller: lote → campo → cliente → `tenantId`), `ExpenseCategoryReaderPort` (categoría del tenant y `active`), `MoneyValuationPort`, `ClockPort`.

**Concurrencia (alto riesgo).** Tres escrituras compiten sobre un mismo gasto: edición/baja directa del ADMIN, creación de sugerencia y aprobación de sugerencia. Reglas:

- La unicidad de "una pendiente por gasto" la garantiza el **índice parcial** (§2.3): el adapter traduce `P2002` a `DuplicateEntityError` → 409.
- Edición/baja directa, aprobación y creación de sugerencia se ejecutan en `prisma.$transaction(..., { isolationLevel: 'Serializable' })` dentro del adapter, verificando en la misma transacción que no hay pendiente (directo) o que la sugerencia sigue `PENDIENTE` (aprobar/rechazar). Un fallo de serialización (`P2034`) se traduce a 409 "reintente".
- La aprobación de una `EDICION` aplica los valores al gasto y marca la sugerencia `APROBADA` en **una** transacción; una `BAJA` da de baja lógica el gasto (`deletedAt`/`deletedBy`) y marca la sugerencia `APROBADA` en la misma transacción; la sugerencia conserva su historial.

Revalorización del gasto: solo cuando `requiresRevaluation` es verdadero se vuelve a pedir `MoneyValuationPort.valueToArs(money)` (precios de ese día); en otro caso se conservan `amountArs`, tasa y fuente. `updatedBy` se guarda siempre. Todo gasto se asigna a la firma del token y valida lote y categoría del tenant.

Visibilidad: `FindExpenseSuggestionsUseCase` recibe `{ role, userId, companyId }`: ADMIN ve todas las de la firma (filtro por estado), SUPERVISOR solo `suggestedBy = userId` (con estado y `rejectionReason`).

### 2.10 Calculadora (`profitability`)

**Campaña** (`profitability/domain/campaign.ts`, pura): `resolveCampaignRange('2025/26') → { from: 2025-07-01, to: 2026-06-30 }`; valida formato `^\d{4}/\d{2}$` y que el sufijo sea `(año+1) % 100`; `campaignOf(date)` y `recentCampaigns(now, n)` alimentan el selector. Un rango personalizado exige `from <= to`. Como `DailyReport.date` es `DateTime` (no solo fecha), el filtro es `date >= from 00:00` y `date < (to + 1 día) 00:00` en hora de `America/Argentina/Cordoba` (la zona que ya usa el Sprint 3 para el clima). Con UTC, un parte del 30/6 a las 22 h (hora argentina) caería en la campaña siguiente por el desfase de 3 horas.

**Métricas** (`profitability/domain/profitability.metrics.ts`, puras): `margin = income − cost`; `marginPerHa = margin / lotArea` (si `area <= 0` → `null`); `profitability = cost == 0 ? null : margin / cost`. Las métricas de la fila de totales se calculan sobre las **sumas**, no promediando filas; `areaTotal` es la suma de `Lot.area` de los lotes listados.

**Puertos**: `ProfitabilityReaderPort` (agregados por lote del rango: ingreso/costo en ARS **y** en nativo, gastos, más lotes con campo y cliente; detalle de partes, gastos y pendientes), `PendingValuationRetryPort`, `MarketSnapshotPort`, `ClockPort`. **D27:** la lista incluye los lotes con partes valorizados, gastos o partes pendientes dentro del rango (no todos los lotes de la firma).

Pseudocódigo de `GetLotProfitabilityListUseCase`:

```text
range   = resolve(campaign | from,to)
retry   = PendingValuationRetryPort.retry(companyId)          # best-effort
rows    = reader.aggregateByLot(companyId, range)             # nativo + ARS al aprobar
if mode == A_VALOR_HOY:
    market = MarketSnapshotPort.getSnapshot(all grains, usd)  # 503 si falta algo requerido
    rows   = rows.map(revalueToday)
return { rows+metrics, totals, pending: reader.pendingSummary(companyId, range) }
```

### 2.11 Endpoints, roles y contrato wire

| Método y ruta | Roles (`@Roles`) | Notas |
|---|---|---|
| `GET /tariffs` · `PUT /tariffs/:laborTypeId` · `DELETE /tariffs/:laborTypeId` | `ADMIN` | `PUT` es upsert por par (D3); tras guardar dispara el reintento (§2.6) |
| `GET /tariffs/kg-equivalents?grain=SOJA` | `ADMIN` | equivalentes en kg de cada tarifa con la política única (R-FIN-04) |
| `GET /expense-categories` · `POST` · `PATCH /:id` · `DELETE /:id` | `ADMIN`, `SUPERVISOR` | `DELETE` → 409 si está en uso |
| `POST /expenses/preview` | `ADMIN`, `SUPERVISOR` | valúa sin persistir (D24) |
| `GET /expenses?lotId=&from=&to=&categoryId=` · `POST /expenses` | `ADMIN`, `SUPERVISOR` | firma del token |
| `PATCH /expenses/:id` · `DELETE /expenses/:id` | `ADMIN` | 409 si hay sugerencia pendiente |
| `POST /expenses/:id/suggestions` | `SUPERVISOR` | cuerpo: `kind` + valores propuestos; 409 si ya hay pendiente |
| `GET /expense-suggestions?status=` | `ADMIN`, `SUPERVISOR` | ADMIN: todas de la firma; SUPERVISOR: solo las suyas |
| `POST /expense-suggestions/:id/approve` · `POST /expense-suggestions/:id/reject` | `ADMIN` | rechazo exige `reason` |
| `GET /profitability/lots?campaign=2025/26&mode=AL_APROBAR` (o `from=&to=`) | `ADMIN` | lista + totales + pendientes |
| `GET /profitability/lots/:lotId?…mismos filtros` | `ADMIN` | detalle |

Todos con `JwtAuthGuard` + `RolesGuard`; `companyId = req.user.firmaId`, `tenantId = req.user.tenantId`, `userId = req.user.id`; ningún `companyId` se lee de body/query. `firmaId` es la primera membresía `UserCompany` del usuario (`prisma-user-credentials.repository.ts:26`), y un `ADMIN` multi-firma verá siempre esa firma (limitación existente; la consolidación y el selector son futuro).

```json
// GET /profitability/lots?campaign=2025/26&mode=AL_APROBAR
{
  "mode": "AL_APROBAR",
  "range": { "campaign": "2025/26", "from": "2025-07-01", "to": "2026-06-30" },
  "lots": [{
    "lotId": "…", "lotName": "Lote N°1", "farmName": "La Esperanza", "clientName": "Eliggi Producciones",
    "areaHa": "100.0000",
    "incomeArs": "600000.00", "standardCostArs": "150000.00", "expensesArs": "50000.00", "costArs": "200000.00",
    "marginArs": "400000.00", "marginPerHaArs": "4000.00", "profitability": "2.0000"
  }],
  "totals": { "areaHa": "…", "incomeArs": "…", "costArs": "…", "marginArs": "…", "marginPerHaArs": "…", "profitability": null },
  "pending": { "reports": 3, "hectares": "120.0000" },
  "valuation": { "usdRateType": null, "priceDate": null }
}
```

`profitability` es `null` (la UI muestra "—") cuando el costo es 0. En modo `A_VALOR_HOY`, `valuation` informa `usdRateType` y el `fetchedAt` de precios.

### 2.12 Consumidor web (`packages/nextjs`)

`src/api/client.ts` gana DTOs y funciones sobre `apiGet/apiPost/apiPut/apiDelete` (sin tocar el transporte). Siguiendo el precedente de `src/app/dashboard/maquinaria/metrics.ts`, la lógica pura vive **junto a la página**:

```text
src/app/dashboard/finanzas/
  page.tsx                 # reemplaza el EmptyState; barra de pestañas con gating por rol
  tarifario-tab.tsx · gastos-tab.tsx · categorias-tab.tsx · sugerencias-tab.tsx · calculadora-tab.tsx · lot-detail-drawer.tsx
  campaign.ts              # selector AAAA/AA y rango (espejo puro del backend)
  metrics.ts               # totales de fila, orden de la tabla, "—" cuando corresponde
  format.ts                # montos string → ARS/kg/%/signos
  access.ts                # canSeeTariffs/canSeeCalculator/canSuggest… (usa isAdminRole/isApproverRole de nav.ts)
test/finance-campaign.test.mjs · finance-metrics.test.mjs · finance-format.test.mjs · finance-access.test.mjs
```

| Opción | Tradeoff | Decisión |
|---|---|---|
| Pestañas dentro de `/dashboard/finanzas` | una ruta y la entrada de navegación ya existe | **Sí** (D18) |
| Subrutas por pestaña | URLs profundas | **No** — complejidad de rutas sin pedido |
| Calcular márgenes en el cliente | menos backend | **No** — la fuente de verdad (política de tasa, redondeo, aislamiento) es una sola: el backend. El cliente solo ordena, formatea y suma la fila de totales de lo ya recibido |

El gating por pestaña es **solo de interfaz** (`layout.tsx` ya gatea cliente); la seguridad es `@Roles`. Las páginas siguen el patrón `"use client"` + `useEffect`. `GET /grain-prices` y `GET /exchange-rate/usd` ya tienen cliente (`getGrainPrices`, `getUsdOfficial`) pero el Tarifario usa `GET /tariffs/kg-equivalents` para no duplicar la política en el cliente.

### 2.13 Testing (T7)

| Capa | Qué | Cómo |
|---|---|---|
| Dominio (`valuation`) | `Dec` (suma, producto, división, redondeo), `toArs` por moneda, `computeValuation` (todo o nada, `0` válido, ha 0 con horas), política de tasa | Jest puro, sin mocks |
| Dominio (`expense`, `profitability`) | `requiresRevaluation`, `assertPendingSuggestion`, `resolveCampaignRange`, métricas (`—` con costo 0) | Jest puro |
| Aplicación | `ValuateDailyReportUseCase` (sin tarifa, precio `null`, solo ARS, tardía), `RetryPendingValuationsUseCase` (idempotente ante `ALREADY_EXISTS`), casos de uso de gasto y sugerencia con fakes in-memory | `Test.createTestingModule` / fakes (patrón de `docs/hexagonal-conventions.md` §Testing Rules) |
| Regresión del cambio existente | `ApproveDailyReportUseCase`: con el gancho que **lanza**, devuelve el mismo parte; con el gancho OK, se invoca **después** de `approveWithStockDeduction` | Jest |
| Adapters | `Prisma*` de valuation/expense: traducción `P2002`/`P2034`, mapeo `Decimal`↔string | Jest con `PrismaService` falso |
| Controller | Roles por endpoint (SUPERVISOR→403 en tarifas/calculadora; OPERARIO→403 en todo), `companyId` ignorado del body, traducción de errores | `*.controller.spec.ts` |
| E2E sin BD | rutas, guards y errores con `PrismaService` y `JwtAuthGuard` sobrescritos | `test/finance.e2e-spec.ts` (patrón `machine-report.e2e-spec.ts`) |
| Web | `campaign.ts`, `metrics.ts`, `format.ts`, `access.ts` | `node --test test/finance-*.test.mjs` (importan `.ts` puros; sin framework nuevo) |
| Verificación manual | flujo completo: tarifa → aprobar parte → calculadora; roles; modo "a valor de hoy" | navegador, sin builds |

Verificación: `npm test` y `npm run test:e2e` (backend), `node --test` (web), `npm run lint` (nextjs). Sin `next build` ni builds (regla del workspace).

## 3. Flujo de datos

```text
Aprobación (camino crítico, intacto)                    Valorización (best-effort, post-commit)
  POST /daily-reports/:id/approve                        DailyReportValuationHookAdapter (try/catch + log)
    ApproveDailyReportUseCase                              └ ValuateDailyReportUseCase
      approveWithStockDeduction  ── commit R017 ──►            tariff = TariffReader(companyId, laborTypeId)
      valuationHook.onApproved ───────────────────────────►   market  = MarketPricePort → GetGrainPrices / GetUsdOfficial (Sprint 3, cache TTL)
      return report (sin cambios)                              computeValuation (pura) ── todo o nada
                                                               ValuationRepository.saveIfAbsent  (UNIQUE dailyReportId)

Reintento (sin scheduler)
  PUT /tariffs/:laborTypeId  ─ guarda ─► RetryPendingValuations(companyId, laborTypeId)
  GET /profitability/lots    ─ abre ───► RetryPendingValuations(companyId)        origin = REINTENTO

Calculadora (ADMIN)                                         Gastos (ADMIN / SUPERVISOR)
  GET /profitability/lots?campaign|from,to&mode              POST /expenses/preview → MoneyValuationPort → resumen ARS
    ├ retry pendientes                                       POST /expenses          → valúa + persiste (createdBy)
    ├ reader.aggregateByLot (firma de sesión)                SUPERVISOR: POST /expenses/:id/suggestions ─► PENDIENTE
    ├ mode A_VALOR_HOY → MarketSnapshot (1 por request)      ADMIN: approve/reject ─► aplica en transacción Serializable
    └ métricas (margen, margen/ha de Lot.area, rentabilidad)
```

## 4. Cambios de archivos

### Backend (`packages/backend/`)

| Archivo | Acción | Qué |
|---|---|---|
| `prisma/schema.prisma` | Modify | Modelos `Tariff`, `DailyReportValuation`, `ExpenseCategory`, `Expense`, `ExpenseSuggestion` y enums (§2.3); relaciones inversas en `Company`, `LaborType`, `Lot`, `DailyReport`, `Tenant` |
| `prisma/migrations/{20261123090000_add_tariffs,20261123100000_add_daily_report_valuations,20261123110000_add_expenses}/migration.sql` | Create | Una por unidad (U1, U2, U3). SQL manual aditivo: `CREATE TYPE`, `CREATE TABLE`, índices únicos, índice parcial de sugerencia pendiente, `CHECK`, FKs |
| `prisma/seed.ts` | Modify | Categorías de gasto y tarifas de ejemplo para las seis labores del seed (T8) |
| `src/entities/valuation/domain/{decimal,money,valuation-rate-policy,valuation.rules,errors}.ts` | Create | Núcleo exacto y puro (§2.1, §2.2, §2.4) |
| `src/entities/valuation/application/ports/{market-price,tariff-reader,daily-report-reader,valuation-repository,clock}.port.ts` | Create | Puertos de `valuation` |
| `src/entities/valuation/application/use-cases/{valuate-daily-report,retry-pending-valuations,value-money,get-market-snapshot}.use-case.ts` | Create | Casos de uso exportados (§2.5–§2.7) |
| `src/entities/valuation/adapters/outbound/{integrations-market-price.adapter,prisma-tariff.reader,prisma-daily-report.reader,prisma-valuation.repository,system-clock}.ts` | Create | Incluye la traducción `P2002` → `ALREADY_EXISTS` |
| `src/entities/valuation/valuation.module.ts` | Create | Composition root; importa `PrismaModule`, `GrainPriceModule`, `ExchangeRateModule`; exporta los casos de uso |
| `src/entities/tariff/**` | Create | domain (validación de tarifa), ports, use cases (`UpsertTariff`, `DeleteTariff`, `FindTariffs`, `GetTariffKgEquivalents`), `PrismaTariffRepository`, `PrismaLaborTypeReader`, adapter `MoneyValuationPort` y `PendingValuationRetryPort`, controller `@Roles('ADMIN')`, `tariff.module.ts` |
| `src/entities/expense-category/**` | Create | Copia `input-category` (CRUD, `CategoryInUseError` → 409), controller `@Roles('ADMIN','SUPERVISOR')` |
| `src/entities/expense/**` | Create | domain, ports, nueve casos de uso (§2.9), repositorios Prisma con transacciones `Serializable`, `PrismaLotReader` (tenant-scoped), controllers `expense` y `expense-suggestion`, `expense.module.ts` |
| `src/entities/profitability/**` | Create | `campaign.ts`, `profitability.metrics.ts`, puertos, `GetLotProfitabilityList/Detail` use cases, `PrismaProfitabilityReader`, controller `@Roles('ADMIN')`, `profitability.module.ts` |
| `src/entities/daily-report/application/daily-report.ports.ts` | Modify | + `DAILY_REPORT_VALUATION_HOOK` y `DailyReportValuationHookPort` |
| `src/entities/daily-report/application/use-cases/approve-daily-report.use-case.ts` | Modify | 5.º parámetro `valuationHook`; invocación post-commit con `try/catch` (§2.5) |
| `src/entities/daily-report/adapters/outbound/valuation-daily-report-hook.adapter.ts` | Create | Llama a `ValuateDailyReportUseCase`, captura y loguea |
| `src/entities/daily-report/daily-report.module.ts` (+ `.module.spec.ts`) | Modify | `imports: [ValuationModule]`, provider del gancho, factory de `ApproveDailyReportUseCase` con 5 dependencias |
| `src/app.module.ts` | Modify | + `ValuationModule`, `TariffModule`, `ExpenseCategoryModule`, `ExpenseModule`, `ProfitabilityModule` |
| `test/finance.e2e-spec.ts` | Create | E2E sin BD |

### Web (`packages/nextjs/`)

| Archivo | Acción | Qué |
|---|---|---|
| `src/api/client.ts` | Modify | DTOs + funciones de tarifas, equivalentes, categorías, gastos, sugerencias y calculadora |
| `src/app/dashboard/finanzas/page.tsx` | Modify | Reemplaza el `EmptyState` por las pestañas con gating por rol |
| `src/app/dashboard/finanzas/{tarifario,gastos,categorias,sugerencias,calculadora}-tab.tsx` + `lot-detail-drawer.tsx` | Create | Pestañas (primitivas `Card`, `Badge`, `Button`, `Drawer`, `TabButton`, `table.tsx`, `form.tsx`, `confirm-dialog.tsx`) |
| `src/app/dashboard/finanzas/{campaign,metrics,format,access}.ts` | Create | Funciones puras |
| `test/finance-{campaign,metrics,format,access}.test.mjs` | Create | `node:test` |
| `src/components/ui/nav.ts` | Unchanged | La entrada Finanzas ya es visible para ADMIN y SUPERVISOR |

### Móvil y raíz

`packages/mobile/**` y `packages/web/**`: **sin cambios**. Raíz: sin cambios de `.env.example` (no hay variables nuevas).

## 5. Migración / Rollout

- **Una migración aditiva escrita a mano por unidad** (T9), con timestamps redondos posteriores a `20261019090000_add_machine_type_and_thresholds`: `20261123090000_add_tariffs` (U1), `20261123100000_add_daily_report_valuations` (U2) y `20261123110000_add_expenses` (U3). Cada unidad se commitea por separado, y editar una migración ya aplicada rompe su checksum en Prisma; por eso no se comparte un único archivo. Solo `CREATE TYPE` / `CREATE TABLE` / índices / FKs; **ninguna tabla ni columna existente se altera** (las relaciones inversas de `schema.prisma` no generan SQL). Incluye lo que Prisma no expresa: índice único parcial de sugerencia pendiente y los `CHECK`. Tras escribirla, `prisma migrate diff` debe mostrar solo esa diferencia esperada.
- **Sin backfill**: los partes anteriores se valorizan por el reintento (§2.6).
- **Orden de rollout**: migración → backend (las rutas nuevas son aditivas; `approve` conserva su contrato) → web. Hasta que exista una tarifa, los partes aprobados quedan "sin valorizar" y nada más cambia.
- **Reversión**: ver proposal (Rollback Plan). `DROP` de los objetos nuevos en orden inverso de dependencias; sin pérdida de datos previos.
- **Alto riesgo declarado**: (1) migración (Unidades 1–3), (2) permisos (Unidades 1, 3 y 4), (3) concurrencia (Unidades 2 y 3), (4) cambio del caso de uso `approve` (Unidad 2). Las Unidades 2 y 3 se commitean por separado para permitir revisión nativa de cada una.

## 6. Preguntas abiertas

- [ ] **Tasa USD (D5):** ¿oficial venta, oficial compra o "TC BNA Divisas Comprador"? Probable cambio; el diseño lo absorbe en una línea.
- [ ] **Gastos generales de firma** prorrateados entre lotes: estacionado para otra discusión.
- [ ] **Redondeo (Supuesto):** a 2 decimales, mitad hacia arriba, al calcular ARS.
- [ ] **Latencia de la aprobación (Supuesto):** el gancho se espera (`await`); si la consulta de precios (timeout 8 s del Sprint 3) degrada la UX de aprobar, evaluar un presupuesto de tiempo o un reintento diferido.
- [ ] **Lote de reintento (Supuesto):** 200 partes por invocación; ¿alcanza para el volumen real al abrir la calculadora?
- [ ] ¿Cobranzas (CUU09) sobre el devengado, precio por cliente y consolidación de grupo: sprint próximo?
- [ ] **Multi-firma:** `firmaId` es la primera membresía del usuario; un ADMIN de varias firmas no puede cambiar de firma hasta que exista el selector de razón social.
