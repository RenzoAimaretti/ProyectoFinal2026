# Apply Progress — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`. Seguimiento ODD: `odd/tasks/sprint4-rentabilidad-indexacion.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Tarifario + indexación | 1.1–1.23 | `4569c53` | ✅ Implementada y verificada |
| 2 | Valorización de partes | 2.1–2.18 | `ce89efc` | ✅ Implementada y verificada |
| 3 | Gastos manuales | 3.1–3.19 | `b3b0401` (esquema) y `e1f1752` (lógica) | ✅ Implementada y verificada |
| 4 | Calculadora | 4.1–4.17 | pendiente de aprobación del usuario | ✅ Implementada y verificada |

---

## Unidad 1 — Tarifario + indexación

### Qué se construyó

- **Esquema y migración:** enums `MoneyUnit`, `Grain`, `TariffBasis`, `UsdRateType` y el modelo `Tariff` (único por `companyId` + `laborTypeId`), con relaciones inversas en `Company` y `LaborType`. Migración propia y aditiva `packages/backend/prisma/migrations/20261123090000_add_tariffs/migration.sql`: cuatro `CREATE TYPE`, un `CREATE TABLE`, índice único, dos FKs (`RESTRICT`) y tres `CHECK` (grano presente si y solo si la unidad es `KG_CEREAL`, para precio y costo; montos `>= 0`). El cliente Prisma versionado en `prisma/generated/` se regeneró (`models/Tariff.ts` nuevo y 10 archivos con cambios reales).
- **Núcleo `valuation`** (`packages/backend/src/entities/valuation/`, 17 archivos): `Dec` exacto sobre `BigInt`, `Money` + `assertValidMoney`, la política única de tasa `VALUATION_USD_RATE_TYPE = 'OFICIAL_VENTA'` (`domain/valuation-rate-policy.ts`, único punto de elección, D5), `toArs` con redondeo a 2 decimales mitad hacia arriba, `MarketSnapshot` (lleva `stale` y momento de obtención, D26), `MarketPricePort`, `ValueMoneyUseCase`, `GetMarketSnapshotUseCase`, y el adapter `integrations-market-price.adapter.ts` sobre `GetGrainPricesUseCase` y `GetUsdOfficialUseCase` (un componente sin dato devuelve `null`, nunca 0).
- **Módulo `tariff`** (`packages/backend/src/entities/tariff/`, 27 archivos): validación (precio y costo obligatorios, cada uno con su moneda y su base, 0 válido), casos de uso `UpsertTariff`, `DeleteTariff`, `FindTariffs`, `GetTariffKgEquivalents`, repositorio Prisma acotado por `companyId`, lector de labores del tenant (no borradas), controller con `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` a nivel de clase: `GET /tariffs`, `PUT /tariffs/:laborTypeId`, `DELETE /tariffs/:laborTypeId`, `GET /tariffs/kg-equivalents?grain=`. `companyId` sale solo de `req.user.firmaId`.
- **Web** (`packages/nextjs/`): DTOs y funciones en `src/api/client.ts`; `finanzas/{format,access,tariff-form}.ts` puros; `finanzas/tarifario-tab.tsx`; `finanzas/page.tsx` reemplaza el "Próximamente" por pestañas con gating (Tarifario solo ADMIN; otros roles ven un estado vacío informativo) y selector de grano solo de UI (soja por defecto).

### Evidencia observada

| Verificación | Resultado |
|---|---|
| `pnpm --filter backend exec prisma validate` | válido |
| `prisma migrate diff --from-schema <base> --to-schema prisma/schema.prisma --script` | igual al SQL escrito a mano, más los 3 `CHECK` |
| `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` | sin errores |
| `pnpm --filter backend test` (suite completa, antes de los 3 tests de regresión) | 159 suites, 1488 tests, todo verde |
| `pnpm --filter backend test -- src/entities/valuation src/entities/tariff` (control del orquestador) | 15 suites, 104 tests, todo verde |
| Tests de regresión agregados tras la verificación (`-0` como cero, notación exponencial rechazada, `companyId` del body ignorado) | `src/entities/tariff`: 8 suites, 58 tests, todo verde |
| `node --test packages/nextjs/test/*.test.mjs` | 28/28 |
| `pnpm --filter nextjs exec tsc --noEmit` | sin errores |
| eslint sobre archivos nuevos (backend y web) | 0 errores (los errores CRLF de `app.module.ts` y el warning de `client.ts:99` son previos) |
| Verificador independiente (migración y permisos) | sin bloqueantes; R-FIN-01..04 y las partes de tarifas de R-FIN-15/16/17: PASS |

**No verificado al cerrar la unidad:** `pnpm --filter backend test:e2e` (el permiso fue denegado al subagente; queda a decisión del usuario porque algunos e2e pueden tocar la base de desarrollo) y la ejecución real de la migración y sus `CHECK` sobre una base Postgres descartable. **Actualización (Unidad 2):** la migración se aplicó sobre la base de desarrollo y los e2e pasaron; ver la evidencia de la Unidad 2.

**Risk:** item 1 (migración nueva: tabla `Tariff` y enums, solo aditiva) e item 2 (endpoints nuevos solo ADMIN, aislados por firma).

**Revisión nativa:** la evaluación sobre el commit dio `medium` (`under_budget`); escalada por el item 1 pasó a `high` con revisión debida. El usuario eligió omitirla para este cambio (`declined_this_candidate`), así que no hay registro de revisión.

### Notas

- RED observado antes de GREEN en cada regla (módulo inexistente o test fallando antes de la implementación).
- `tariff/application/tariff.test-fakes.ts` es soporte de tests sin sufijo `.spec.ts`, por lo que entra en `dist`; es inofensivo y queda como mejora menor.
- En Node 24, `node --test <directorio>` no funciona; se usa el glob `packages/nextjs/test/*.test.mjs`.

---

## Unidad 2 — Valorización de partes

### Qué se construyó

- **Esquema y migración:** enum `ValuationOrigin` y modelo `DailyReportValuation` (un snapshot por parte, `dailyReportId` único), con relaciones inversas en `DailyReport` y `Tariff`. Migración propia y aditiva `packages/backend/prisma/migrations/20261123100000_add_daily_report_valuations/migration.sql`: un `CREATE TYPE`, un `CREATE TABLE`, índice único `dailyReportId`, índice `(companyId, lotId)`, FK a `DailyReport` (`RESTRICT`), FK a `Tariff` (`SET NULL`) y tres `CHECK` (grano presente si y solo si la unidad es `KG_CEREAL`, para precio y costo; montos y cantidades `>= 0`). Cliente Prisma regenerado (`models/DailyReportValuation.ts` nuevo y 10 archivos con cambios reales).
- **Núcleo `valuation`:** `computeValuation` (base por hectárea o por hora, todo o nada, los insumos no entran al costo), `revalueToday` (kg y USD con el mercado de hoy y la política vigente, ARS sin cambio, `MarketUnavailableError` si falta un dato) y `quantityFromNumber` (convierte los `Float` de hectáreas y horas a decimal exacto desde su forma textual). Casos de uso `ValuateDailyReportUseCase` (`APROBACION`) y `RetryPendingValuationsUseCase` (`REINTENTO`, límite 200), con resultado `VALUADO | SIN_TARIFA | PRECIO_NO_DISPONIBLE | YA_VALORIZADO`; un fallo en un parte se registra en `failures` y el resto continúa. Adapters Prisma acotados por `companyId`: lector de tarifas, lector de partes (aprobados sin valorizar con `NOT EXISTS`, y resumen de pendientes con conteo y suma de hectáreas sin límite) y repositorio con `saveIfAbsent`, que traduce el `P2002` de `dailyReportId` a `ALREADY_EXISTS` dentro del adapter.
- **Cambio al caso de uso de aprobación (alto riesgo):** `ApproveDailyReportUseCase` recibe un quinto puerto, `DailyReportValuationHookPort`. Se invoca después de que `approveWithStockDeduction` confirma la transacción, dentro de un `try/catch`, y el caso de uso devuelve el mismo parte que antes. Una aprobación rechazada (stock insuficiente, parte inexistente, ya decidido, lote sin cliente) no llega al gancho. El adapter `valuation-daily-report-hook.adapter.ts` captura y registra cualquier error. `ValuationModule` no importa `DailyReportModule`, así que no hay ciclo. El contrato HTTP de `POST /daily-reports/:id/approve` no cambió.
- **Tarifas:** `PUT /tariffs/:laborTypeId` ahora dispara el reintento de los partes pendientes de esa firma y labor (`PendingValuationRetryPort`). Es best-effort: un error se registra y no cambia la respuesta.
- **Seed:** el reseteo de datos de demostración borra `DailyReportValuation` y `Tariff` antes que partes y labores, porque las FKs nuevas impedían volver a correr el seed.

### Evidencia observada

| Verificación | Resultado |
|---|---|
| `pnpm --filter backend exec prisma validate` | válido |
| `prisma migrate diff --from-schema <esquema de 4569c53> --to-schema prisma/schema.prisma --script` | igual al SQL escrito a mano, más los 3 `CHECK` |
| `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` (incluye `prisma/seed.ts`) | sin errores |
| `pnpm --filter backend test -- src/entities/valuation src/entities/tariff src/entities/daily-report` (control del orquestador) | 33 suites, 302 tests, todo verde |
| Tests de regresión agregados tras la verificación (`P2002` con el campo entre comillas que devuelve el adapter de pg: `dailyReportId` se traduce, `id` se propaga) | `prisma-valuation.repository.spec.ts`: 9 tests, todo verde |
| `pnpm --filter backend test` (suite completa, candidato final) | 168 suites, 1556 tests, todo verde |
| eslint sobre archivos nuevos y modificados | 0 errores nuevos (los de estilo CRLF son previos) |
| Verificador independiente (migración, contrato del `approve`, idempotencia, aislamiento por firma) | sin bloqueantes; R-FIN-05..08: PASS (el disparador al abrir la calculadora y el modo 503 son de la Unidad 4) |
| `pnpm --filter backend exec prisma migrate status` sobre la base de desarrollo (Postgres local) | 19 migraciones, "Database schema is up to date!": `add_tariffs` y `add_daily_report_valuations` aplicadas sin errores |
| `pnpm --filter backend test:e2e` (corrido por el usuario sobre la base de desarrollo) | todos pasaron, según informó el usuario |

**No verificado:** que los `CHECK` rechacen filas inválidas en la base real (la migración se aplicó, pero no se probó insertar datos inválidos), la concurrencia real sobre Postgres (la idempotencia se probó con fakes y con la forma del error de Prisma 7.8 con el adapter de pg) y la ejecución del seed.

**Risk:** item 1 (migración nueva `DailyReportValuation`, solo aditiva), item 3 (cambio del caso de uso compartido `approve`, con el contrato R017 intacto) e item 4 (reintentos concurrentes idempotentes por índice único).

**Revisión nativa:** la evaluación del commit, escalada por el item 3, dio `high` con revisión debida y el usuario la aceptó, pero el revisor la rechazó por tamaño (`lens_context_budget_exceeded`): el cliente Prisma generado solo suma 3235 líneas. Sin registro de revisión. El usuario decidió dejar el commit sin revisión nativa en lugar de dividirlo.

### Notas

- RED observado antes de GREEN en cada regla, salvo dos specs de adapters escritos junto con su adapter (gancho de aprobación y reintento desde tarifas); su comportamiento de orden quedó cubierto por el RED del caso de uso.
- El ARS se calcula desde el monto nativo redondeado a 4 decimales, así que el snapshot y el "valor a hoy" coinciden a igual precio. `priceFetchedAt` es el más antiguo de los componentes usados y `priceStale` es verdadero solo si se usó un componente desactualizado.
- **Para la Unidad 4:** el reintento de toda la firma (sin labor) toma los 200 partes pendientes más antiguos; si esos no tienen tarifa, bloquean a los que sí podrían valorizarse. El disparador de tarifas filtra por labor y no se ve afectado. Conviene resolverlo cuando se agregue el disparador de la calculadora.
- **Latencia:** el gancho se espera dentro de la aprobación y el reintento desde tarifas valoriza hasta 200 partes de a uno; un proveedor lento demora la respuesta. El diseño lo acepta como best-effort (ver design §6).

---

## Unidad 3 — Gastos manuales

### Qué se construyó

- **Esquema y migración:** enums `ExpenseSuggestionKind` y `ExpenseSuggestionStatus`; modelos `ExpenseCategory` (por tenant, nombre único, flag `active`), `Expense` (un lote, una firma, monto en ARS/USD/kg con su valorización, `createdBy`/`updatedBy` y baja lógica con `deletedAt`/`deletedBy`) y `ExpenseSuggestion` (`EDICION` o `BAJA`, valores propuestos, quién propuso y quién resolvió). Migración propia y aditiva `packages/backend/prisma/migrations/20261123110000_add_expenses/migration.sql`: tablas, índices, FKs `RESTRICT` (las sugerencias no se borran en cascada, así conservan su historial), el **índice único parcial** `ExpenseSuggestion_one_pending_per_expense` (`WHERE "status" = 'PENDIENTE'`) y cuatro `CHECK` (grano si y solo si la unidad es `KG_CEREAL`, montos `>= 0`, monto propuesto `>= 0` y una `BAJA` sin valores propuestos). Cliente Prisma regenerado.
- **Categorías de gasto** (`src/entities/expense-category/`), copiando `input-category`: nombre duplicado → 409, borrado en uso → 409 (cuenta también gastos dados de baja) con la opción de inactivar, categoría de otro tenant → 404, inactiva → 400 al crear un gasto. Rutas `GET/POST /expense-categories` y `PATCH/DELETE /expense-categories/:id` para ADMIN y SUPERVISOR.
- **Gastos y sugerencias** (`src/entities/expense/`): vista previa sin persistir (D24), alta con valorización del día y rechazo 503 si un gasto en USD o kg no tiene precio, con el aviso "reintentá en unos minutos o cargá el gasto en ARS" (D25), edición y baja directas solo para ADMIN (409 si hay una sugerencia pendiente; revaloriza solo si cambian monto, moneda o grano), listados sin los gastos dados de baja, sugerencias del SUPERVISOR (una pendiente por gasto), aprobación y rechazo solo para ADMIN (rechazo con motivo obligatorio, sugerencia resuelta es final), y visibilidad: ADMIN ve todas las de la firma, SUPERVISOR solo las suyas, incluida una `BAJA` aprobada.
- **Concurrencia:** edición y baja directas, alta de sugerencia, aprobación y rechazo corren en transacciones `Serializable` que vuelven a verificar el estado adentro. `P2002` del índice parcial → 409; fallo de serialización (`P2034`) → 409 "reintente"; además hay un control optimista por `updatedAt`.
- **Aislamiento:** firma, tenant y usuario salen solo del token; el lote se valida por lote → campo → cliente → tenant (404 si es de otro); toda consulta de gastos y sugerencias filtra por `companyId` y las categorías por `tenantId`.
- **Web** (`packages/nextjs/`): pestañas Gastos (listado, formulario ARS/USD/kg con grano, resumen de confirmación vía `previewExpense`, acciones directas solo para ADMIN y "Sugerir edición/baja" para SUPERVISOR), Categorías (el 409 de borrado ofrece inactivar) y Sugerencias (bandeja del ADMIN; vista del SUPERVISOR con estado y motivo). ADMIN ve Tarifario, Gastos, Categorías y Sugerencias; SUPERVISOR ve Gastos, Categorías y sus Sugerencias; los demás roles ven el estado vacío informativo.
- **Seed:** el reseteo borra sugerencias, gastos y categorías de gasto antes que los lotes. La carga de categorías y tarifas de ejemplo es la tarea 4.11 (Unidad 4).

### Evidencia observada

| Verificación | Resultado |
|---|---|
| `pnpm --filter backend exec prisma validate` | válido |
| `prisma migrate diff --from-schema <esquema de ce89efc> --to-schema prisma/schema.prisma --script` | igual al SQL escrito a mano, menos el índice parcial y los 4 `CHECK` |
| `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` (incluye `prisma/seed.ts`) | sin errores |
| `pnpm --filter backend test -- src/entities/expense src/entities/expense-category` (control del orquestador) | 14 suites, 215 tests, todo verde |
| `node --test packages/nextjs/test/*.test.mjs` (control del orquestador) | 61/61 |
| `pnpm --filter nextjs exec tsc --noEmit` | sin errores |
| Test agregado tras la verificación: `expense.routes.spec.ts` fija verbo y ruta de cada handler de gastos y sugerencias | 11 tests, todo verde |
| `pnpm --filter backend test` (suite completa, candidato final) | 183 suites, 1782 tests, todo verde |
| eslint backend y `pnpm --filter nextjs lint` | 0 errores nuevos (2 warnings previos en la web) |
| Verificador independiente (migración, matriz de roles, concurrencia, aislamiento, web) | sin bloqueantes; R-FIN-09, 10, 11 y las partes de gastos de 15, 16 y 17: PASS |
| `pnpm --filter backend exec prisma migrate status` sobre la base de desarrollo (Postgres local) | 20 migraciones, "Database schema is up to date!": `add_expenses` (con el índice parcial y los `CHECK`) aplicada sin errores |
| `pnpm --filter backend test:e2e` (corrido por el usuario sobre la base de desarrollo) | todos pasaron, según informó el usuario (no hay un e2e de finanzas; confirman que el resto del backend sigue funcionando) |

**No verificado:** un e2e de finanzas (`test/finance.e2e-spec.ts` de design §2.13 queda pendiente), que los `CHECK` y el índice parcial rechacen filas inválidas en la base real, el comportamiento real de las transacciones `Serializable` con dos sugerencias simultáneas, la ejecución del seed y una prueba visual de las tres pestañas nuevas.

**Risk:** item 1 (migración nueva con índice único parcial, solo aditiva), item 2 (matriz de permisos ADMIN/SUPERVISOR) e item 4 (una sugerencia pendiente por gasto con transacciones `Serializable`).

**Revisión nativa:** la unidad se commiteó en dos partes para que la lógica entrara en el límite del revisor: `b3b0401` (esquema, migración, cliente generado y reseteo del seed) y `e1f1752` (módulos, web y documentación). La evaluación de `e1f1752`, escalada por el item 2, dio `high` con revisión debida y el usuario la aceptó, pero el revisor la rechazó igual por tamaño (`lens_context_budget_exceeded`, 8899 líneas). Sin registro de revisión. El usuario decidió dejarla sin revisión nativa en lugar de dividirla más.

### Notas

- **Sugerencias:** copian las reglas del parte diario (`PENDIENTE`, `APROBADA`, `RECHAZADA`; rechazo con motivo; resolución final). La aprobación de una `EDICION` aplica los valores y marca la sugerencia en una sola transacción; la de una `BAJA` da de baja lógica el gasto y marca la sugerencia en la misma transacción.
- **Baja lógica:** se eligió para que una `BAJA` aprobada siga visible para el supervisor que la propuso; los listados excluyen los gastos con `deletedAt`, y la calculadora de la Unidad 4 debe hacer lo mismo.
- Desvíos aceptados del diseño: `PATCH` para categorías (como dice design §2.11, aunque `input-category` usa `PUT`), `apiPatch` agregado al cliente web, `ConcurrentModificationError` extra, fechas de gasto guardadas a medianoche UTC, y campos extra en las respuestas (`pendingSuggestionId` en el gasto y un resumen del gasto con marca `deleted` en la sugerencia).
- RED observado antes de GREEN en cada regla, salvo `expense.module.spec`, el cableado del módulo de categorías y dos tests de regresión (`client.ts` y reseteo del seed) que pasaron de entrada.
- El índice parcial y los `CHECK` no se expresan en `schema.prisma`; un `prisma migrate dev` futuro podría reportar diferencias, como ya pasa con las Unidades 1 y 2.

---

## Unidad 4 — Calculadora

### Qué se construyó

- **Dominio de lectura** (`src/entities/profitability/domain/`): campaña agrícola `AAAA/AA` del 1 de julio al 30 de junio (sufijo = año siguiente; otro sufijo → 400), campaña actual por defecto, rango personalizado (`desde <= hasta`; combinar campaña con rango, o mandar solo uno de los extremos → 400). Los partes se filtran por `[desde 00:00, hasta + 1 día 00:00)` en hora argentina (UTC-3 fijo, sin horario de verano desde 2009); los gastos, guardados a medianoche UTC, por días completos. Métricas: margen bruto, margen por hectárea sobre `Lot.area` (`null` si el área es 0) y rentabilidad sobre el costo (`null` si el costo es 0); la fila de totales se calcula sobre las sumas.
- **Aplicación y adapters:** `GetLotProfitabilityListUseCase` reintenta las valorizaciones pendientes de la firma (best-effort), agrega por lote y, en modo `A_VALOR_HOY`, pide **una** foto de mercado con solo los granos y el dólar necesarios y revaloriza ingreso, costo estándar y gastos con la política vigente (503 si falta un dato; `AL_APROBAR` nunca consulta el mercado). Solo aparecen los lotes con partes valorizados, partes pendientes o gastos vigentes (D27). `GetLotProfitabilityDetailUseCase` devuelve partes valorizados, gastos por categoría con subtotal y pendientes; un lote de otro tenant → 404. `PrismaProfitabilityReader` filtra toda cifra por la firma de sesión, llega a los lotes por la cadena del tenant y excluye gastos dados de baja.
- **Endpoints:** `GET /profitability/lots` y `GET /profitability/lots/:lotId`, solo ADMIN, con la firma tomada del token (un `companyId` en el query se ignora; un parámetro repetido → 400).
- **Reintento sin inanición (advertencia A2 de la Unidad 2):** el reintento de toda la firma ahora toma solo partes cuya labor tiene tarifa en esa firma, así los partes sin tarifa no ocupan los 200 lugares. El reintento al guardar una tarifa no cambió y el resumen de pendientes sigue contando todos los partes sin valorizar.
- **Web:** pestaña Calculadora (solo ADMIN, última pestaña; el ADMIN sigue entrando por Tarifario) con selector de campaña y rango, alternador "Al aprobar / A valor de hoy" sin columnas duplicadas, tabla ordenable por cualquier columna (orden estable, nulos al final) con fila de totales fija, aviso de partes y hectáreas sin valorizar, mensaje claro ante el 503 y panel de detalle por lote.
- **Seed (4.11):** categorías Combustible, Reparación, Mantenimiento, Flete, Mano de obra y Otros, y tarifas de ejemplo de la firma del seed:

| Labor | Precio | Costo |
|---|---|---|
| Pulverización | 12 kg de soja por ha | 8000 ARS por hora |
| Fertilización | 9 USD por ha | 6000 ARS por hora |
| Siembra | 30 kg de soja por ha | 10000 ARS por hora |
| Arranque de equipo | 25000 ARS por hora | 12000 ARS por hora |
| Traslado | 0 ARS por hora | 5 USD por hora |
| Pesaje | 15000 ARS por hora | 0 ARS por hora |

- **E2E de finanzas sin base de datos** (`test/finance.e2e-spec.ts`, patrón `machine-report.e2e-spec.ts`): 19 rutas de tarifas, categorías, gastos, sugerencias y calculadora contra los 7 roles y sin token, más 16 casos de traducción de errores (400, 403, 404, 409, 503). Solo `JwtAuthGuard` se sobrescribe; `RolesGuard` y el ruteo son reales.

### Evidencia observada

| Verificación | Resultado |
|---|---|
| `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` (incluye `prisma/seed.ts`) | sin errores |
| `pnpm --filter backend test -- src/entities/profitability src/entities/valuation` (control del orquestador) | 24 suites, 226 tests, todo verde |
| `pnpm exec jest --config ./test/jest-e2e.json test/finance.e2e-spec.ts` (sin base de datos, control del orquestador) | 1 suite, 42 tests, todo verde |
| `node --test packages/nextjs/test/*.test.mjs` | 92/92 |
| `pnpm --filter nextjs exec tsc --noEmit` | sin errores |
| `pnpm --filter backend test` (suite completa, candidato final) | 193 suites, 1908 tests, todo verde |
| `pnpm --filter nextjs lint` | 0 errores, 2 warnings previos (`client.ts:99`, `auth.tsx:26`) |
| Chequeo de fronteras (5.5): imports de Prisma o `@nestjs/common` en `domain`/`application` de los cinco módulos nuevos | ninguno |
| `git diff --stat origin/dev -- packages/mobile packages/web` (5.10) | sin cambios |
| Verificador independiente (permisos, aislamiento entre firmas, cuentas, consultas Prisma, web) | sin bloqueantes; R-FIN-12, 13, 14, las partes de la calculadora de 15, 16 y 17, R-FIN-07 (b) y el modo de R-FIN-08: PASS |
| `pnpm --filter backend test:e2e` (5.2, corrido por el usuario; incluye `finance.e2e-spec.ts`) | todos pasaron, según informó el usuario |

**No verificado:** las consultas del lector contra una base Postgres real (solo se probaron con un Prisma falso y con los tipos generados), la ejecución del seed, la migración sobre una base limpia (5.6) y las pruebas manuales 5.7 y 5.8 con backend y web levantados (incluye mirar la pestaña y el panel de detalle).

**Risk:** item 2 (endpoints solo ADMIN con los datos financieros de la firma; aislamiento R033).

### Notas

- **Cierre de R032 con ingreso devengado (desviación D1):** la rentabilidad por lote se calcula con el ingreso **devengado** (partes aprobados × tarifa de la firma), no con "ingresos cobrados" como dice R032. El sistema no modela facturación ni cobranzas (CUU09); cuando existan, se agregarían encima de este cálculo sin reemplazarlo. Queda como pendiente para un sprint próximo.
- Desvíos aceptados del diseño: el resumen de pendientes de la calculadora se limita al rango consultado; el lector devuelve una fila por componente y el caso de uso suma por lote (lista y detalle coinciden al centavo); los importes en USD y kg se convierten por fila y luego se suman, así un total puede diferir en centavos de redondear el total exacto; la fila de totales la calcula la API y no el cliente (design §2.12 decía lo contrario); se agregó 404 en el detalle para no exponer el nombre de un lote de otro tenant.
- **Inanición residual:** los partes con tarifa pero sin precio disponible siguen pendientes y pueden ocupar lugares del reintento; es más acotado que antes y es el comportamiento previo del reintento.
- El escenario "Costo sin ingreso" ya estaba cubierto en `get-lot-profitability-list.use-case.spec.ts` (costo 8000 sin ingreso → margen -8000, rentabilidad -1); el verificador no lo encontró, pero no hizo falta agregar nada.
- RED observado antes de GREEN en cada regla, salvo el e2e (caja negra sobre código existente), el spec del módulo, el test del seed, dos specs de adapters y los tests de `canSeeCalculator`.
