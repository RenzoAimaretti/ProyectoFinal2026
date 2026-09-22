# ODD — schema-backend-multifirma

> Organic Driven Development feature document.
> Mirror en Engram: `odd/schema-backend-multifirma/tasks`

## Objective

Alinear el `schema.prisma` del backend con el **modelo de datos actualizado** (multi-firma
real + entidades de dominio nuevas + enums en español) y producir una **migración limpia**
sobre la base de dev reseteada.

## Problem

El backend usa `Company` como firma **y** como tenant key a la vez, y le faltan las entidades
que el móvil ya persiste (drift, 20 tablas). El contrato `contrato-esquema-prisma` (§1–§7)
declara los deltas, y la app móvil de Sprint 1 ya los implementó — el backend todavía no los
absorbió.

## Why

Sin esto el motor de sync de Sprint 2 nace sobre dos esquemas divergentes. Además el
aislamiento multi-tenant actual (`req.user.firmaId` como tenant key) no soporta multi-firma,
que es el modelo de negocio declarado (`doc/vision.md:24-34,51`).

## Scope

**Dentro:**
- `packages/backend/prisma/schema.prisma` — modelo completo actualizado.
- Migración limpia + reset de la base de dev (volumen docker `postgres_data`).
- Fixes mínimos de compatibilidad para que el backend compile y sus tests pasen.
- Móvil: renombrar enums a español + migración de strings drift.

**Fuera (deuda explícita, change aparte e inmediato):**
- Rework de enforcement: tenant key `firmaId` → `tenantId`; scoping de `Lot`/`Task` vía
  `Farm.clientId → Client → Tenant`; JWT con `tenantId`.
- Endpoints nuevos para las entidades nuevas.
- Validación de recepción en web (contrato §7.5).
- Roles `OPERATIVO_ADMINISTRATIVO` / `INGENIERO_AGRONOMO` (visión §2.2, no están en ningún enum).

## Constraints (decisiones cerradas)

| ID | Decisión | Fuente |
|----|----------|--------|
| D1 | Multi-firma con entidad `Tenant` explícita; `Company` = firma; `UserCompany` M:N | usuario |
| D2 | `Farm.clientId` SOLO, sin `companyId` (Opción B) | usuario |
| D3 | Catálogos (`Client`, `Input`, `TaskType`) scope **tenant** | usuario |
| D4 | Enums en **español** en backend y móvil | usuario |
| D5 | Alcance: schema + migración (no endpoints) | usuario |
| D6 | `Stock` NO se particiona por firma → `@@unique([clientId, inputId])` | B1 confirmada |
| D7 | `Reception` tenant-scoped (sin firma) | B2 confirmada |
| D8 | `MachineActivity.companyId` **NOT NULL** (R019) | B3 confirmada |
| D9 | `PhotoEntityType` = `{ PARTE_DIARIO, RECEPCION, ACTIVIDAD_MAQUINARIA }` | B4 confirmada |
| D10 | `RecipeStatus` = `{ ACTIVA, ARCHIVADA }` | B5 confirmada |
| D11 | Base de dev descartable → **reset del volumen** y migrar desde cero | B6 confirmada |
| D12 | `tenantId` solo en raíces de tenant; el resto deriva por su cadena de padres | decisión ODD (no se desnormaliza) |
| D13 | Firma del parte vive en `DailyReport.companyId`; `Task` NO lleva `companyId` | contrato §7.4 |

## Authorized scope

Cambios en `packages/backend/prisma/**`, `packages/backend/src/**` (solo fixes de
compatibilidad), `packages/mobile/lib/**` y `packages/mobile/test/**` (solo enums). Sin
push, sin PR, sin merge.

## Route per task

| Task | Ruta | Trigger |
|------|------|---------|
| T01 | inline | un solo archivo mecánico, ya diseñado |
| T02 | inline | comandos de estado/infra |
| T03 | delegado (writer) | 2+ archivos no triviales |
| T04 | delegado (writer) | 2+ archivos no triviales (móvil) |

## Checklist

- [x] **T01** Reescribir `packages/backend/prisma/schema.prisma` con el modelo actualizado:
      `Tenant`, `Company.tenantId` (firma), `UserCompany` M:N, `Farm.clientId`,
      `TaskType.tenantId` + `version`/`deleted`, `Task.version`/`deleted`,
      y las entidades nuevas: `Client`, `Input`, `Recipe`/`RecipeItem`,
      `DailyReport`/`DailyReportItem` (con `taskId`), `Reception`/`ReceptionItem`,
      `Stock`, `Photo`, `MachineActivity`.
      Enums nuevos en español: `DailyReportStatus`, `ReceptionStatus`,
      `MachineActivityType`, `PhotoEntityType`, `RecipeStatus`. `UserRole` amplía `SUPERVISOR`.
- [x] **T02** Squash: 5 migraciones históricas → 1 baseline (`20260922214007_multifirma_baseline`),
      aplicada sobre la base reseteada.
- [x] **T03** Rework de clave de tenancy (decisión A): dejar `pnpm --filter backend test` verde.
      Ver `## Modelo de scoping`.
- [ ] **T04** Móvil: renombrar enums a español, migración de strings drift
      (`schemaVersion` + `onUpgrade`), y actualizar converters/mappers/seeders/tests.
- [x] **T05** Bootstrap/seed: `Tenant` + `Company` + `User` + `UserCompany` iniciales.
      Script `packages/backend/prisma/seed.ts` + `pnpm --filter backend db:seed`.
      Ejecutado **2 veces**: idempotente (`1|1|1|1`).
- [ ] **T06** Limpiar naming engañoso de ports: métodos `...ByCompanyId` / `...ForCompany` que
      hoy reciben un `tenantId`.

## Acceptance criteria

1. `schema.prisma` refleja D1–D13 sin contradicciones.
2. La migración se aplica limpia sobre la base reseteada.
3. `pnpm --filter backend test` verde.
4. `flutter test` verde con enums en español.
5. Ninguna tabla pierde la posibilidad de resolver su tenant por cadena de padres.

## Applicable checks

- Backend: `pnpm --filter backend test` — TDD: **off** (sin setting explícito de proyecto para
  ODD; el runner es la verificación, no RED-GREEN). Sin build salvo pedido explícito.
- Móvil: `flutter test`.
- No `build` por restricción `no_build: true`.

## Forecast / delivery

~450–600 líneas autoradas. **Atómico por naturaleza**: un cambio de schema + su migración no
se puede trocear en PRs encadenados sin romper la base. Estrategia: `ask-on-risk` (default);
si supera el presupuesto, se explica el motivo en vez de partir artificialmente.

## Progress

- 2026-09-22 — Feature document creado. T01 en curso.
- 2026-09-22 — **T01 COMPLETADA.** `schema.prisma` reescrito y validado.
- 2026-09-22 — **Bloqueante detectado en T03**: el schema rompe el typecheck del backend.
- 2026-09-22 — **Decisión A**: rework de tenancy dentro de este feature. Rama `feat/multifirma-schema`.
- 2026-09-22 — **T03 COMPLETADA.** Backend verde: `tsc` 0 errores, 266/266 tests.
- 2026-09-22 — **Gaps detectados** (bootstrap y naming). Ver `## Gaps`.
- 2026-09-22 — **Scope aclarado por el usuario**: "clases nuevas de dominio" = los modelos Prisma
  (cubierto por T01). La capa de dominio/módulos hexagonales va **después**. **T04 (móvil) y
  T06 (naming de ports) quedan FUERA de esta tarea** (van a sus propios carriles).
- 2026-09-22 — **Work-unit commits**: `570667e` (backend, 100 archivos) + `3152daa` (doc ODD).
  Rama `feat/multifirma-schema`.
- 2026-09-22 — **T05 seed escrito**: `prisma/seed.ts` + script `db:seed` + `prisma.config.ts`.
  Typecheck OK. **NO ejecutado** (DB caída).
- 2026-09-22 — **T02 estuvo bloqueado** (sin Postgres). Docker levantado por el usuario.
- 2026-09-22 — **T02 COMPLETADA.** Squash: 5 migraciones → 1 baseline
  (`20260922214007_multifirma_baseline`), aplicada sobre schema dropeado (30 tablas).
- 2026-09-22 — **T05 COMPLETADA.** Seed ejecutado 2 veces → `1|1|1|1` (idempotente).
- 2026-09-22 — **e2e**: `auth.e2e-spec` **PASA 5/5** (login verificado end-to-end contra la base
  real con el JWT nuevo). `app.e2e-spec` FALLA con 404 en `GET /` → **pre-existente**: no existe
  `AppController` y `app.module.ts` tiene `controllers: []`. No es nuestro.
- 2026-09-22 — **Hallazgo**: los e2e no cargaban `dotenv`, así que `process.env.JWT_SECRET` era
  `undefined` y firmar el token daba 500. **Defecto pre-existente** de `test/jest-e2e.json`.
  Se agregó `setupFiles: ["dotenv/config"]` porque era precondición para verificar nuestro cambio.
- 2026-09-22 — **Hallazgo**: `test/auth.e2e-spec.ts` mockeaba `PrismaService` con la forma vieja
  (`companyId`, sin `companyMemberships`) → 500 por `TypeError`. Alineado al contrato nuevo.

## Verification evidence

| Check | Comando | Resultado |
|-------|---------|-----------|
| Schema válido | `pnpm exec prisma validate` | ✅ "The schema at prisma\schema.prisma is valid" |
| Prisma Client | `pnpm exec prisma generate` | ✅ Generado (7.8.0) en `prisma/generated` |
| Typecheck (antes de T03) | `pnpm exec tsc --noEmit -p tsconfig.json` | ❌ 65 errores en 21 archivos |
| Typecheck (tras T03) | `pnpm exec tsc --noEmit -p tsconfig.json` | ✅ **0 errores** (re-verificado por el orquestador) |
| Tests (tras T03) | `pnpm --filter backend test` | ✅ **35/35 suites, 266/266 tests** (re-verificado por el orquestador) |
| e2e | `test/app.e2e-spec.ts` | ⏸️ Compila, NO ejecutado (requiere Postgres vivo) |
| Config de seed | `pnpm exec prisma validate` | ✅ Acepta `migrations.seed` sin error |
| Typecheck con seed | `pnpm exec tsc --noEmit -p tsconfig.json` | ✅ 0 errores (incluye `prisma/seed.ts`) |
| Postgres (antes) | `pnpm exec prisma migrate status` | ❌ `P1001` — no alcanzable en `127.0.0.1:5432` |
| Migración | `pnpm exec prisma migrate dev --name multifirma_baseline` | ✅ 1 baseline creada y aplicada |
| Seed | `pnpm --filter backend db:seed` (x2) | ✅ `1|1|1|1` en Tenant/Company/User/UserCompany |
| e2e auth | `pnpm --filter backend test:e2e` | ✅ `auth.e2e-spec` 5/5 (login OK end-to-end) |
| e2e app | ídem | ❌ `app.e2e-spec` 404 en `GET /` — **pre-existente** |

### Detalle del typecheck (evidencia)

Los 65 errores están **todos en `adapters/outbound/**`** más `test/app.e2e-spec.ts`.
**Cero** errores en `application/**` y `domain/**` — la arquitectura hexagonal contuvo el daño
al borde de infraestructura.

Causas (agrupadas):
- `FarmRecord.companyId` ya no existe → `clientId` (farm adapter + `farm.types.ts`).
- `TaskTypeRecord.companyId` → `tenantId` (task-type adapter + `task-type.types.ts`).
- `UserRecord.companyId` → `tenantId` (user adapter + `auth.types.ts`).
- `FarmSelect/FarmWhereInput/UserWhereInput/UserWhereUniqueInput/TaskTypeWhereInput.companyId`
  ya no existen.
- `PrismaUserReader.findByIdForCompany` y `PrismaTaskReader.findByIdWithOperatorsForCompany`
  ya no cumplen su port.
- `res select { farm: { companyId } }` en `prisma-lot.reader.ts`.

## Decisión del blocker: **A** (2026-09-22)

El usuario eligió incluir el rework de clave de tenancy en este feature. Se trabaja en la rama
`feat/multifirma-schema` para que `arq-tenants` quede verde mientras tanto.

## Modelo de scoping (regla de T03)

Se preserva la semántica actual donde el dueño no cambió, y se cambia la clave donde el
dueño **sí** cambió (consecuencia directa de D1–D3):

| Entidad | Dueño | Clave de scoping | Cambia? |
|---------|-------|------------------|---------|
| `Farm`, `Lot` | Tenant (via `Client`) | `tenantId` | ✅ sí |
| `TaskType`, `User` | Tenant | `tenantId` | ✅ sí |
| `Client`, `Input` (sin endpoints aún) | Tenant | `tenantId` | n/a |
| `Machine`, `Livestock` | Firma | `companyId` (firma activa) | ❌ no |
| `DailyReport`, `MachineActivity` | Firma | `companyId` | ❌ no (sin endpoints aún) |
| `Task` | Derivado → tenant | via `Lot → Farm → Client → Tenant` | ✅ sí |
| `MachineUsage`, `LivestockEvent`, `WeightRecord`, `LivestockMovement` | Derivado | cadena de padres | según padre |

**JWT**: pasa a `{ sub, tenantId, firmaId, role }`.
- `tenantId` ← `User.tenantId` (nuevo).
- `firmaId` ← firma primaria activa de `UserCompany` (reemplaza a `User.companyId`, que ya no existe).

**Controllers**: `farm`, `lot`, `task-type`, `user` leen `req.user.tenantId`;
`machine`, `livestock` y los indirectos mantienen `req.user.firmaId`.

**Único cambio de contrato HTTP inevitable**: `POST/PUT /farms` ahora requiere `clientId` en el
body (validado contra el tenant autenticado). Es forzoso: un campo pertenece a un cliente y
`Farm.companyId` dejó de existir.

**Deuda registrada**: `firmaId` en el JWT es una firma por defecto elegida en el login. El
contrato §6 dice que la firma se elige post-login como contexto global; cuando exista ese
selector, `firmaId` pasará a venir por request en vez de por claim. No cambia el modelo de datos.

## Gaps (hallazgos post-T03)

1. **Huevo y gallina de bootstrap**: `Company.tenantId` es NOT NULL y `POST /companies` ahora
   exige JWT (el tenant sale del token). Con la base reseteada y **sin seed**, no hay forma de
   crear el primer `Tenant`/`Company`, así que **nadie puede loguearse**. → T05.
2. **Usuario nuevo sin `UserCompany`**: `create-user` solo escribe `User.tenantId`. Sin membresía
   activa el login se rechaza (no hay `firmaId` suficiente). Falta provisión de membresías.
3. **Naming engañoso de ports**: `findAllByCompanyId(tenantId)`, `...ForCompany(tenantId)`.
   Compila, pero es una trampa para el próximo dev. → T06.
4. **e2e no ejecutado**: `pnpm --filter backend test` corre solo specs unitarios (`rootDir: src`).
   `test/app.e2e-spec.ts` necesita Postgres vivo. → verificar en T02.
5. **`Task` pasó a scope tenant** (antes derivaba por `Farm.companyId`). Es lo que dice el modelo
   de scoping, pero es el punto a revisar si el negocio lo quería por firma.
6. **Deuda registrada**: `firmaId` del JWT es una firma por defecto resuelta en el login
   (`UserCompany` activa más antigua). El contrato §6 pide selector post-login. Sin cambios de datos.

## Next step

**T01 + T02 + T05 hechos y verificados.** Queda commitear los work-units de T02/T05.

Fuera de esta tarea (carriles propios): **T04** (móvil, enums ES) y **T06** (naming de ports).

Deuda detectada y NO tocada (pre-existente): `test/app.e2e-spec.ts` espera `GET /` → 200
"Hello World!" pero no existe `AppController`.
