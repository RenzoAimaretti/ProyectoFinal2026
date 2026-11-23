# Apply Progress — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`. Seguimiento ODD: `odd/tasks/sprint4-rentabilidad-indexacion.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Tarifario + indexación | 1.1–1.23 | `4569c53` | ✅ Implementada y verificada |
| 2 | Valorización de partes | 2.1–2.18 | pendiente de aprobación del usuario | ✅ Implementada y verificada |
| 3 | Gastos manuales | 3.x | — | Pendiente |
| 4 | Calculadora | 4.x | — | Pendiente |

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

### Notas

- RED observado antes de GREEN en cada regla, salvo dos specs de adapters escritos junto con su adapter (gancho de aprobación y reintento desde tarifas); su comportamiento de orden quedó cubierto por el RED del caso de uso.
- El ARS se calcula desde el monto nativo redondeado a 4 decimales, así que el snapshot y el "valor a hoy" coinciden a igual precio. `priceFetchedAt` es el más antiguo de los componentes usados y `priceStale` es verdadero solo si se usó un componente desactualizado.
- **Para la Unidad 4:** el reintento de toda la firma (sin labor) toma los 200 partes pendientes más antiguos; si esos no tienen tarifa, bloquean a los que sí podrían valorizarse. El disparador de tarifas filtra por labor y no se ve afectado. Conviene resolverlo cuando se agregue el disparador de la calculadora.
- **Latencia:** el gancho se espera dentro de la aprobación y el reintento desde tarifas valoriza hasta 200 partes de a uno; un proveedor lento demora la respuesta. El diseño lo acepta como best-effort (ver design §6).
