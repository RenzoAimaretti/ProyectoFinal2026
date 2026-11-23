# Tasks — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

> Orden por dependencia: **Unidad 1** (núcleo de valuación + tarifario) → **Unidad 2** (valorización de partes; depende del núcleo y de `Tariff`) → **Unidad 3** (gastos; depende del núcleo y de `Decimal`) → **Unidad 4** (calculadora; depende de 2 y 3). Cada unidad lleva sus pruebas y su documentación y se commitea por separado (el commit lo decide el usuario). Base: `design.md`, `spec.md` y `docs/hexagonal-conventions.md`.
>
> **Riesgo alto por unidad** (Task Size): U1 = migración + permisos · U2 = migración + concurrencia + cambio del `approve` existente · U3 = migración + permisos + concurrencia · U4 = permisos. Cada tarea de código cierra con `Risk: item N (motivo)` o `Risk: none`.

## 1. Unidad 1 — Tarifario + indexación (R030, R031, R032)

**Riesgo alto:** item 1 (migración: tabla `Tariff` y enums) e item 2 (permisos: endpoints ADMIN-only).

### 1.A Migración y esquema

- [x] 1.1 `prisma/schema.prisma`: agregar enums `MoneyUnit`, `Grain`, `TariffBasis`, `UsdRateType` y el modelo `Tariff` con `@@unique([companyId, laborTypeId])` y relaciones inversas en `Company` y `LaborType` (design §2.3, spec R-FIN-01/02).
- [x] 1.2 Escribir a mano la migración aditiva `prisma/migrations/20261123090000_add_tariffs/migration.sql`, propia de esta unidad (una migración **por unidad**: editar una migración ya aplicada rompe su checksum en Prisma) (`CREATE TYPE` de los cuatro enums, `CREATE TABLE "Tariff"`, índice único, FKs, `CHECK ("priceUnit" = 'KG_CEREAL') = ("priceGrain" IS NOT NULL)` y análogo para costo, montos `>= 0`). Timestamp redondo posterior a `20261019090000_add_machine_type_and_thresholds` (design §2.3/§5, T9).

### 1.B Núcleo de valuación (dominio y aplicación)

- [x] 1.3 `src/entities/valuation/domain/decimal.ts`: tipo `Dec` inmutable sobre `BigInt` (`parse`, `add`, `sub`, `mul`, `div`, `roundHalfUp`, `toString`), sin imports de Prisma (design §2.1, T1).
- [x] 1.4 `src/entities/valuation/domain/money.ts`: `Money`, `MoneyUnit`, `Grain` y `assertValidMoney` (grano obligatorio solo en `KG_CEREAL`, monto `>= 0`, 0 permitido) (spec R-FIN-02).
- [x] 1.5 `src/entities/valuation/domain/valuation-rate-policy.ts`: `UsdRateType` y la constante única `VALUATION_USD_RATE_TYPE = 'OFICIAL_VENTA'`; función `usdRateFor(market)` que lee el campo según la política (design §2.2, D5/T2).
- [x] 1.6 `src/entities/valuation/domain/valuation.rules.ts`: `toArs(money, market)` (ARS, USD×tasa, kg×precio/1000, `null` si falta dato, redondeo a 2 decimales) (spec R-FIN-03).
- [x] 1.7 `src/entities/valuation/domain/errors.ts` y `application/ports/market-price.port.ts` (`MARKET_PRICE`, `MarketPricePort`, `MarketSnapshot`) (design §2.2).
- [x] 1.8 `src/entities/valuation/application/use-cases/value-money.use-case.ts` (`ValueMoneyUseCase`: monto → ARS con registro de precio/tasa, fuente y tipo de tasa) y `get-market-snapshot.use-case.ts` (un snapshot de precios con `need`) (design §2.2/§2.8).
- [x] 1.9 `src/entities/valuation/adapters/outbound/integrations-market-price.adapter.ts`: implementa `MarketPricePort` inyectando `GetGrainPricesUseCase` y `GetUsdOfficialUseCase`; un error `Upstream*` de un componente produce `null` en ese componente; consulta solo lo requerido (design §2.2, T4).
- [x] 1.10 `src/entities/valuation/valuation.module.ts`: composition root (`useFactory` + tokens `Symbol`); importa `PrismaModule`, `GrainPriceModule` y `ExchangeRateModule`; exporta `ValueMoneyUseCase` y `GetMarketSnapshotUseCase` (por ahora).

### 1.C Módulo `tariff`

- [x] 1.11 `src/entities/tariff/domain/`: validación de tarifa (precio y costo obligatorios, bases `POR_HECTAREA`/`POR_HORA`, monedas con `assertValidMoney`), `errors.ts` (spec R-FIN-01/02).
- [x] 1.12 `src/entities/tariff/application/`: puertos (`TariffRepositoryPort`, `LaborTypeReaderPort` del tenant, `MoneyValuationPort`, `ClockPort`) y casos de uso `UpsertTariffUseCase` (upsert por par firma+labor, `updatedBy`), `DeleteTariffUseCase`, `FindTariffsUseCase`, `GetTariffKgEquivalentsUseCase` (design §2.8, spec R-FIN-04).
- [x] 1.13 `src/entities/tariff/adapters/outbound/`: `PrismaTariffRepository` (mapeo `Decimal`↔string), `PrismaLaborTypeReader` (labor del **tenant** del caller), adapter de `MoneyValuationPort` sobre `ValueMoneyUseCase`.
- [x] 1.14 `src/entities/tariff/adapters/inbound/tariff.controller.ts`: `GET /tariffs`, `PUT /tariffs/:laborTypeId`, `DELETE /tariffs/:laborTypeId`, `GET /tariffs/kg-equivalents?grain=`; `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`; `companyId = req.user.firmaId`, nunca del body/query; traducción 400/404/503 (design §2.11, spec R-FIN-15).
- [x] 1.15 `src/entities/tariff/tariff.module.ts` y registro de `ValuationModule` y `TariffModule` en `src/app.module.ts`.

### 1.D Web: Tarifario

- [x] 1.16 `src/api/client.ts`: DTOs y funciones `getTariffs`, `putTariff`, `deleteTariff`, `getTariffKgEquivalents(grain)` (design §2.12).
- [x] 1.17 `src/app/dashboard/finanzas/{format,access}.ts`: formato de montos string y reglas de acceso por pestaña (puras) (design §2.12).
- [x] 1.18 `src/app/dashboard/finanzas/page.tsx` + `tarifario-tab.tsx`: reemplazar el `EmptyState`, barra de pestañas con gating (Tarifario solo ADMIN), tabla de tarifas por tipo de labor (precio y costo estándar, cada uno con moneda y base), formulario con validación (grano obligatorio en kg, 0 permitido) y **selector de grano** solo de UI (default soja) con equivalentes en kg; nota visible: "editar una tarifa solo afecta valorizaciones futuras" (spec R-FIN-04/16).

### 1.E Tests y documentación de la unidad

- [x] 1.19 Jest dominio: `decimal.spec.ts`, `money.spec.ts`, `valuation.rules.spec.ts` (kg→ARS, USD→ARS con la tasa de la política, ARS directo, grano `null` → sin dato, redondeo), `valuation-rate-policy.spec.ts` (spec R-FIN-02/03).
- [x] 1.20 Jest aplicación con fakes: `ValueMoneyUseCase` y casos de uso de `tariff` (upsert por par, precio/costo faltante → 400, 0 válido, equivalentes con grano sin precio → `null`).
- [x] 1.21 Jest adapter y controller: `integrations-market-price.adapter.spec.ts` (usa solo lo requerido; error upstream → `null`), `tariff.controller.spec.ts` (SUPERVISOR/OPERARIO → 403, 401 sin token, `companyId` del body ignorado).
- [x] 1.22 Web: `test/finance-format.test.mjs` y `test/finance-access.test.mjs` con `node:test`.
- [x] 1.23 Documentación: describir el Tarifario y la política de tasa en la sección de Finanzas de los docs del change; `Risk:` declarado para la migración y los permisos.

## 2. Unidad 2 — Valorización de partes (R030, R031, R032, CUU05)

**Riesgo alto:** item 1 (migración: `DailyReportValuation`), item 4 (concurrencia: reintentos idempotentes) y **cambio del caso de uso existente `ApproveDailyReportUseCase`** (contrato de aprobación R017 debe quedar intacto).

### 2.A Esquema

- [x] 2.1 `prisma/schema.prisma`: enum `ValuationOrigin` y modelo `DailyReportValuation` (`dailyReportId @unique`, `tariffId` con `onDelete: SetNull`, campos aplicados, cantidades nativas, precios/tasa usados, resultados ARS, `valuedAt`) y relaciones inversas en `DailyReport` y `Tariff` (design §2.3).
- [x] 2.2 Migración manual propia `prisma/migrations/20261123100000_add_daily_report_valuations/migration.sql` (enum, tabla, índice único `dailyReportId`, índice `companyId,lotId`, `CHECK`s de grano y de montos) (T9).

### 2.B Valorización y reintento

- [x] 2.3 `valuation.rules.ts`: `computeValuation(report, tariff, market, policy)` pura — base `POR_HECTAREA`/`POR_HORA`, cantidades nativas, todo o nada, un parte con horas y 0 ha produce costo sin ingreso (spec R-FIN-02/05/06).
- [x] 2.4 Puertos de `valuation`: `TariffReaderPort`, `DailyReportReaderPort` (por id y `findApprovedWithoutValuation` con `limit`), `ValuationRepositoryPort` (`saveIfAbsent` → `'CREATED' | 'ALREADY_EXISTS'`), `ClockPort`.
- [x] 2.5 `ValuateDailyReportUseCase` (`origin: APROBACION`) y `RetryPendingValuationsUseCase` (`origin: REINTENTO`, `limit` 200 — **Supuesto**) con resultado tipado `VALUADO | SIN_TARIFA | PRECIO_NO_DISPONIBLE | YA_VALORIZADO` (design §2.4/§2.6, spec R-FIN-05..07).
- [x] 2.6 Adapters Prisma: `PrismaTariffReader`, `PrismaDailyReportReader` (partes `APROBADO` sin valorización, `NOT EXISTS`; resumen de pendientes con conteo y suma de hectáreas), `PrismaValuationRepository` (traduce `P2002` de `dailyReportId` a `ALREADY_EXISTS` **dentro del adapter**).
- [x] 2.7 Exportar `ValuateDailyReportUseCase` y `RetryPendingValuationsUseCase` desde `ValuationModule`.
- [x] 2.8 `tariff`: tras `UpsertTariffUseCase`, disparar el reintento de **esa firma y labor** por un `PendingValuationRetryPort` (adapter sobre `RetryPendingValuationsUseCase`), best-effort: el error se loguea y no cambia la respuesta del `PUT` (spec R-FIN-07).

### 2.C Cambio al caso de uso de aprobación (alto riesgo)

- [x] 2.9 `daily-report.ports.ts`: `DAILY_REPORT_VALUATION_HOOK` + `DailyReportValuationHookPort.onApproved(...)` con contrato "no lanza" (design §2.5, T6).
- [x] 2.10 `approve-daily-report.use-case.ts`: 5.º parámetro `valuationHook`; invocarlo **después** de `approveWithStockDeduction` dentro de `try/catch` y devolver el mismo parte; actualizar los tests existentes del caso de uso (4 → 5 argumentos).
- [x] 2.11 `daily-report/adapters/outbound/valuation-daily-report-hook.adapter.ts`: llama a `ValuateDailyReportUseCase`, captura y loguea con `Logger`; `daily-report.module.ts` importa `ValuationModule`, provee el gancho y la factory con 5 dependencias; actualizar `daily-report.module.spec.ts`. Verificar que `ValuationModule` **no** importa `DailyReportModule` (sin ciclo).
- [x] 2.12 Confirmar que el contrato HTTP de `POST /daily-reports/:id/approve` (respuesta y códigos) no cambió, incluida la ruta de error de stock insuficiente (R017).

### 2.D Valor a hoy

- [x] 2.13 `valuation.rules.ts`: `revalueToday(nativeAmounts, market)` (kg y USD con el mercado de hoy, ARS sin cambio, sin ajuste por inflación) y `MarketUnavailableError` si falta un dato requerido (spec R-FIN-08, design §2.7).

### 2.E Tests y documentación de la unidad

- [x] 2.14 Jest dominio: `computeValuation` (tarifa en kg/USD/ARS, bases por hectárea y por hora, 0 ha con horas, tarifa con 0, precio `null` → todo o nada) y `revalueToday` (kg a precio nuevo, ARS fijo) (spec R-FIN-05/06/08).
- [x] 2.15 Jest aplicación con fakes: `ValuateDailyReportUseCase` (sin tarifa → `SIN_TARIFA`, mercado caído → `PRECIO_NO_DISPONIBLE`, solo ARS no consulta mercado, snapshot registra tasa/fuente/fecha) y `RetryPendingValuationsUseCase` (marca `REINTENTO`, `ALREADY_EXISTS` no es error, `limit`).
- [x] 2.16 **Prueba de concurrencia**: dos reintentos simultáneos sobre el mismo parte producen una sola valorización y ninguno falla (fake de repositorio con conflicto) (spec R-FIN-07).
- [x] 2.17 **Regresión del `approve`**: con el gancho que lanza, el resultado es idéntico al de antes del sprint; con el gancho OK se invoca después de `approveWithStockDeduction`; una aprobación rechazada por stock **no** invoca el gancho (spec R-FIN-05/06).
- [x] 2.18 Documentación: registrar `Risk: item 1, 4` y el cambio del `approve` en el log del change; anotar que `PUT /tariffs` ahora dispara reintentos.

## 3. Unidad 3 — Gastos manuales (R032)

**Riesgo alto:** item 1 (migración: `ExpenseCategory`, `Expense`, `ExpenseSuggestion` e índice parcial), item 2 (permisos: matriz ADMIN/SUPERVISOR) e item 4 (concurrencia: una sugerencia pendiente por gasto).

### 3.A Esquema

- [x] 3.1 `prisma/schema.prisma`: enums `ExpenseSuggestionKind` y `ExpenseSuggestionStatus`; modelos `ExpenseCategory`, `Expense` y `ExpenseSuggestion`; relaciones inversas en `Tenant`, `Company` y `Lot` (design §2.3).
- [x] 3.2 Migración manual propia `prisma/migrations/20261123110000_add_expenses/migration.sql`: tablas, `@@unique(tenantId,name)`, FKs (sugerencias sin cascada), columnas `deletedAt`/`deletedBy` de `Expense` (baja lógica), `CHECK`s de grano/monto y el **índice único parcial** `"ExpenseSuggestion_one_pending_per_expense" ... WHERE "status" = 'PENDIENTE'` (design §2.3/§2.9).

### 3.B Categorías de gasto

- [x] 3.3 `src/entities/expense-category/**` copiando `input-category`: dominio (`CategoryInUseError`), puertos, `Create/Update/Delete/Find` use cases, `PrismaExpenseCategoryRepository`, controller `@Roles('ADMIN','SUPERVISOR')` (409 por nombre duplicado y por borrado en uso; PATCH de `active`), `expense-category.module.ts` (spec R-FIN-09).

### 3.C Gastos

- [x] 3.4 `src/entities/expense/domain/`: validación del gasto con `Money`, `requiresRevaluation(current, next)` (monto, moneda o grano), `errors.ts` (design §2.9).
- [x] 3.5 `src/entities/expense/application/ports/`: `ExpenseRepositoryPort`, `ExpenseSuggestionRepositoryPort`, `LotReaderPort` (lote del **tenant**), `ExpenseCategoryReaderPort` (del tenant y `active`), `MoneyValuationPort`, `ClockPort`.
- [x] 3.6 Casos de uso: `PreviewExpenseUseCase` (valúa sin persistir), `CreateExpenseUseCase` (guarda `createdBy`/`updatedBy`; gasto USD/kg sin precio → `MarketUnavailableError` con aviso "reintentar o cargar en ARS", D25), `UpdateExpenseUseCase` y `DeleteExpenseUseCase` (ADMIN; 409 con sugerencia pendiente; revalúa solo si `requiresRevaluation`; el borrado es baja lógica), `FindExpensesUseCase` (excluye gastos dados de baja) (spec R-FIN-10/11).
- [x] 3.7 Adapters Prisma de `expense`: repositorios con transacciones `Serializable` en edición/baja directa, creación y resolución de sugerencias; traducción `P2002` → `DuplicateEntityError` (409) y `P2034` → 409 "reintente"; `PrismaLotReader` tenant-scoped (lote de otro tenant → 404).

### 3.D Sugerencias

- [x] 3.8 `domain`: `assertPendingSuggestion` (copia de `assertPendingApproval`, `daily-report.rules.ts:43`) y regla de motivo obligatorio al rechazar (copia de `reject-daily-report.use-case.ts:25`).
- [x] 3.9 Casos de uso: `CreateExpenseSuggestionUseCase` (`EDICION` con valores propuestos o `BAJA`; una pendiente por gasto), `FindExpenseSuggestionsUseCase` (ADMIN: todas de la firma; SUPERVISOR: solo `suggestedBy = userId`, con estado y motivo), `ApproveExpenseSuggestionUseCase` (aplica la edición/baja y marca `APROBADA` en una transacción; revalúa solo si corresponde) y `RejectExpenseSuggestionUseCase` (motivo obligatorio, estado final) (spec R-FIN-11).
- [x] 3.10 Controllers `expense` y `expense-suggestion`: rutas y `@Roles` de design §2.11 (`PATCH`/`DELETE /expenses/:id` solo ADMIN; `POST /expenses/:id/suggestions` solo SUPERVISOR; approve/reject solo ADMIN); `expense.module.ts` y registro de `ExpenseCategoryModule` y `ExpenseModule` en `app.module.ts`.

### 3.E Web: Gastos, Categorías, Sugerencias

- [x] 3.11 `src/api/client.ts`: funciones de categorías, gastos (`previewExpense`, `createExpense`, `updateExpense`, `deleteExpense`) y sugerencias (`createExpenseSuggestion`, `getExpenseSuggestions`, `approveExpenseSuggestion`, `rejectExpenseSuggestion`).
- [x] 3.12 `categorias-tab.tsx` (ADMIN y SUPERVISOR; botón de borrar maneja el 409 y ofrece inactivar) y `gastos-tab.tsx` (listado por lote/fecha/categoría; formulario con moneda ARS/USD/kg+grano; **resumen de confirmación con la valorización en ARS** antes de guardar vía `previewExpense`; acciones directas solo para ADMIN y "Sugerir edición/baja" para SUPERVISOR) (spec R-FIN-10/16, D24).
- [x] 3.13 `sugerencias-tab.tsx`: bandeja del ADMIN (aprobar / rechazar con motivo) y vista del SUPERVISOR con el estado y el motivo de rechazo de **sus** sugerencias; el gasto con sugerencia pendiente muestra la marca y deshabilita la edición directa del ADMIN.
- [x] 3.14 Gating por pestaña: SUPERVISOR ve Gastos, Categorías y sus sugerencias; no ve Tarifario ni Calculadora (`access.ts`) (spec R-FIN-15/16).

### 3.F Tests y documentación de la unidad

- [x] 3.15 Jest dominio y aplicación con fakes: valuación de gasto en ARS/USD/kg, `requiresRevaluation` (solo monto/moneda/grano), una pendiente por gasto (409), ADMIN con pendiente (409), rechazo sin motivo (400), resolución final (409), visibilidad por rol, lote de otro tenant (404), categoría inactiva rechazada.
- [x] 3.16 Jest controller: matriz de roles de cada endpoint (SUPERVISOR 403 en edición/borrado directo y approve/reject; ADMIN 403 en `POST /expenses/:id/suggestions` si corresponde; OPERARIO 403), `companyId` ignorado del body (spec R-FIN-15).
- [x] 3.17 Jest adapter: traducción `P2002`/`P2034`, transacción atómica de la aprobación de una `EDICION`, `BAJA` da de baja lógica el gasto y la sugerencia queda `APROBADA` y visible; los gastos dados de baja no aparecen en listados ni en la calculadora.
- [x] 3.18 Web: ampliar `test/finance-access.test.mjs` (pestañas por rol, acciones por rol) y `test/finance-format.test.mjs` (resumen de confirmación).
- [x] 3.19 Documentación: reglas de sugerencias y decisión de baja lógica en el log del change; `Risk: item 1, 2, 4`.

## 4. Unidad 4 — Calculadora (R032, R033, CUU05)

**Riesgo alto:** item 2 (permisos: endpoints ADMIN-only con datos financieros de la firma; aislamiento R033).

### 4.A Dominio de lectura

- [x] 4.1 `src/entities/profitability/domain/campaign.ts`: `resolveCampaignRange('AAAA/AA')` (1 jul – 30 jun inclusive, sufijo = año+1), `campaignOf(date)`, `recentCampaigns(now, n)`, validación de rango personalizado (`from <= to`) (spec R-FIN-12, D17).
- [x] 4.2 `src/entities/profitability/domain/profitability.metrics.ts`: `margin`, `marginPerHa` (sobre `Lot.area`; `null` si área <= 0) y `profitability` (`null` si costo = 0); agregación de la fila de totales **sobre sumas** (spec R-FIN-13, D20).

### 4.B Aplicación y adapters

- [x] 4.3 Puertos: `ProfitabilityReaderPort` (agregados por lote del rango, detalle, resumen de pendientes), `PendingValuationRetryPort`, `MarketSnapshotPort`, `ClockPort`; adapters sobre `RetryPendingValuationsUseCase` y `GetMarketSnapshotUseCase` (design §2.10).
- [x] 4.4 `GetLotProfitabilityListUseCase`: reintenta pendientes (best-effort) → agrega por lote la firma de sesión → en `A_VALOR_HOY` pide **un** snapshot de mercado y revaloriza ingreso, costo estándar y gastos (503 si falta un dato requerido) → métricas + totales + pendientes (spec R-FIN-08/13).
- [x] 4.5 `GetLotProfitabilityDetailUseCase`: partes valorizados (labor, fecha, cantidad, tarifa aplicada, ingreso, costo estándar), gastos agrupados por categoría con subtotal y partes pendientes (spec R-FIN-14).
- [x] 4.6 `PrismaProfitabilityReader`: consultas filtradas por `companyId` de sesión y rango `[from 00:00, to+1d 00:00)` en hora de `America/Argentina/Cordoba`; excluye gastos dados de baja; incluye lotes con partes valorizados, gastos o pendientes; nunca datos de otra firma (R033).
- [x] 4.7 `profitability.controller.ts`: `GET /profitability/lots` y `GET /profitability/lots/:lotId` con `@Roles('ADMIN')`; `campaign` o `from`+`to` y `mode` (`AL_APROBAR` | `A_VALOR_HOY`); 400 ante campaña inválida o rango invertido; `profitability.module.ts` y registro en `app.module.ts`.

### 4.C Web: Calculadora

- [x] 4.8 `src/app/dashboard/finanzas/campaign.ts` y `metrics.ts` (puras): opciones de campaña, rango personalizado, ordenamiento de la tabla (por cualquier columna, estable, nulos al final), formato de "—" y signo de márgenes negativos (spec R-FIN-12/16).
- [x] 4.9 `calculadora-tab.tsx`: filtro de campaña + rango personalizado, **toggle "Al aprobar / A valor de hoy"** (sin columnas duplicadas), tabla ordenable (campo, cliente, superficie, ingreso, costo, margen bruto, margen/ha, rentabilidad) con fila de totales fija, banner de partes y hectáreas sin valorizar y manejo del 503 del modo "a valor de hoy" (spec R-FIN-13/16, D21).
- [x] 4.10 `lot-detail-drawer.tsx` (`Drawer`): partes valorizados, gastos por categoría y pendientes (spec R-FIN-14).

### 4.D Seed y demo

- [x] 4.11 `prisma/seed.ts`: cargar las categorías Combustible, Reparación, Mantenimiento, Flete, Mano de obra y Otros, y **tarifas de ejemplo** para Pulverización, Fertilización, Siembra, Arranque de equipo, Traslado y Pesaje (mezcla de ARS, USD y kg de soja; Traslado con precio 0) de la firma del seed (T8, spec R-FIN-17).

### 4.E Tests y documentación de la unidad

- [x] 4.12 Jest dominio: `campaign.spec.ts` (2025/26 → 2025-07-01..2026-06-30, `2025/28` → inválida, rango invertido) y `profitability.metrics.spec.ts` (ejemplo del spec: 600000/150000/50000 → margen 400000, 4000 por ha, rentabilidad 2; costo 0 → `null`; costo sin ingreso → margen negativo; totales sobre sumas).
- [x] 4.13 Jest aplicación con fakes: modo `AL_APROBAR` vs `A_VALOR_HOY` (ARS iguales, kg revalorizados), 503 con mercado caído solo en `A_VALOR_HOY`, reintento previo, pendientes informados, aislamiento por firma.
- [x] 4.14 Jest controller: SUPERVISOR/OPERARIO → 403, 401 sin token, `companyId` del query ignorado, 400 de campaña/rango inválidos.
- [x] 4.15 `test/finance.e2e-spec.ts` **sin BD** (patrón `machine-report.e2e-spec.ts`: sobrescribe `PrismaService` y `JwtAuthGuard`): rutas, roles y traducción de errores de tarifas, gastos, sugerencias y calculadora.
- [x] 4.16 Web: `test/finance-campaign.test.mjs` y `test/finance-metrics.test.mjs` con `node:test`.
- [x] 4.17 Documentación: describir en el log del change el cierre de R032 con ingreso **devengado** (desviación D1) y el pendiente de cobranzas.

## 5. Verificación global

- [x] 5.1 `npm test` verde en `packages/backend` (suites de `valuation`, `tariff`, `expense-category`, `expense`, `profitability` y regresión de `daily-report`).
- [x] 5.2 `npm run test:e2e` verde en `packages/backend` (incluye `finance.e2e-spec.ts` sin base de datos).
- [x] 5.3 `node --test test/finance-*.test.mjs` verde en `packages/nextjs`.
- [x] 5.4 `npm run lint` en `packages/nextjs` sin errores nuevos.
- [x] 5.5 Boundary check: ningún `import` de Prisma ni de `@nestjs/common` HTTP fuera de `adapters/outbound/**`, `adapters/inbound/**` y `src/prisma` en los cinco módulos nuevos; `docs/hexagonal-conventions.md` §Acceptance Checklist.
- [ ] 5.6 `prisma migrate diff` (o equivalente) muestra únicamente los objetos nuevos; la migración aplica sobre una base limpia y sobre una con datos existentes sin alterar tablas previas.
- [ ] 5.7 E2E manual con backend y web levantados: guardar tarifa → aprobar un parte → la calculadora muestra ingreso/costo/margen; aprobar un parte sin tarifa → "sin valorizar" y la aprobación **no falla**; guardar la tarifa → el pendiente se valoriza; modo "a valor de hoy" con mercado disponible.
- [ ] 5.8 Verificación de roles manual: SUPERVISOR no ve Tarifario ni Calculadora y recibe 403 al invocar sus endpoints; ADMIN con sugerencia pendiente no puede editar directo; sugerencia rechazada muestra el motivo al SUPERVISOR.
- [x] 5.9 Revisión independiente de las unidades con riesgo alto nombrado (migración, permisos, concurrencia, cambio del `approve`): la decisión de verificador/revisión nativa la toma el orquestador según la evaluación de riesgo.
- [x] 5.10 Confirmar que `packages/mobile` y `packages/web` no tienen cambios (`git diff --stat`).

## Explicit Non-Goals

- [ ] No ingresos **cobrados**, facturación ni cobranzas (CUU09): R032 se cubre con ingreso devengado; las cobranzas se agregarían encima, sin reemplazarlo.
- [ ] No gastos generales de firma prorrateados entre lotes (estacionado para discusión posterior).
- [ ] No campos propios o arrendados de la firma Eliggi.
- [ ] No histórico de precios ni ajuste por inflación; el "valor a hoy" no ajusta los ARS.
- [ ] No costos reales de maquinaria (combustible/mantenimiento por lote).
- [ ] No tarifas por viaje o por unidad ni precios por cliente.
- [ ] No consolidación de grupo ni "selector de razón social".
- [ ] No tabla de prorrateo de gastos ni modelo `Campaign`.
- [ ] No scheduler, cron ni script de backfill: el reintento ocurre al guardar tarifa y al abrir la calculadora.
- [ ] No R026–R029 ni R034.
- [ ] No cambios en `packages/mobile` ni en `packages/web`.
- [ ] No framework de tests en `packages/nextjs` (solo `node:test`).
- [ ] No `next build` ni `flutter build` (regla del workspace).
