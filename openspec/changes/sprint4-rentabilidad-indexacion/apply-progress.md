# Apply Progress — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`. Seguimiento ODD: `odd/tasks/sprint4-rentabilidad-indexacion.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Tarifario + indexación | 1.1–1.23 | pendiente de aprobación del usuario | ✅ Implementada y verificada |
| 2 | Valorización de partes | 2.x | — | Pendiente |
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

**No verificado:** `pnpm --filter backend test:e2e` (el permiso fue denegado al subagente; queda a decisión del usuario porque algunos e2e pueden tocar la base de desarrollo) y la ejecución real de la migración y sus `CHECK` sobre una base Postgres descartable.

**Risk:** item 1 (migración nueva: tabla `Tariff` y enums, solo aditiva) e item 2 (endpoints nuevos solo ADMIN, aislados por firma).

### Notas

- RED observado antes de GREEN en cada regla (módulo inexistente o test fallando antes de la implementación).
- `tariff/application/tariff.test-fakes.ts` es soporte de tests sin sufijo `.spec.ts`, por lo que entra en `dist`; es inofensivo y queda como mejora menor.
- En Node 24, `node --test <directorio>` no funciona; se usa el glob `packages/nextjs/test/*.test.mjs`.
