# Feature: Phytosanitary prescription editor & spray-volume / dose calculation

An **agronomist** (`INGENIERO`) user type writes a phytosanitary prescription
(receta) for each task (actividad) the administrator creates in Producción. Until
that prescription exists, the task is flagged as "sin receta" and cannot be
executed. The prescription carries the crop, the target pest, the spray volume
and the per-input dose and load order, and the console computes the total spray
volume and the total amount of each product from the lot surface area.

Confirmed by reconnaissance: **no agronomist role and no agronomist view exist
today**. `UserRole` has no `INGENIERO`; the Next.js console has no `/dashboard`
route for it; `Recipe` exists in the schema and has a full hexagon but is
**lot-scoped, has no create endpoint**, and is not linked to any task. There is
also **no notification system of any kind** in the repository.

## Requirements

- R1 — A new `INGENIERO` role can log into the console and only sees the
  prescription module (plus read access to tasks and inputs).
- R2 — A task whose `TaskType` requires a prescription is born `SIN_RECETA` and
  becomes `CON_RECETA` once a prescription is attached. Task types that do not
  require one stay `NO_REQUIERE` and are unaffected.
- R3 — The agronomist has an inbox of tasks pending a prescription
  (in-app, derived by query) and a counter in the navigation.
- R4 — The agronomist writes the prescription: date, target pest, crop,
  observations, spray volume, and one row per input with dose, dosage basis,
  unit and load order. An optional re-application plan (R010) can be recorded.
- R5 — The editor computes, live and on the server, the total spray volume (L)
  for the lot and the total amount of each product.
- R6 — A prescription is valid as soon as it is created; there is no
  administrator approval step.
- R7 — A prescription is editable until its task starts; once the task is
  `EN_PROGRESO` or `FINALIZADA` it is frozen and can only be archived.
- R8 — Existing lot-scoped recipe reads (`GET /recipes?lotId=`) keep working for
  the mobile app; new fields are additive.

## Design decisions (approved)

| # | Decision |
|---|----------|
| 1 | "Actividad" is the existing `Task` of the Producción module. No parallel entity. |
| 2 | The editor lives in the Next.js console at `/dashboard/recetas`. |
| 3 | The agronomist is a new `INGENIERO` role in `UserRole` / `AUTH_USER_ROLES` / `MODULES_BY_ROLE` / seed. |
| 4 | "Sin receta" is a dedicated `Task.prescriptionStatus` field, orthogonal to `TaskStatus` (execution progress). Only phytosanitary task types require a prescription. |
| 5 | One prescription per task (`Recipe.taskId @unique`). |
| 6 | Dosage basis is per row: `POR_HECTAREA` or `CONCENTRACION`. |
| 7 | Notifications are an in-app derived inbox plus a navigation counter. No new infrastructure. |
| 8 | Target pest, crop and the re-application plan are added to `Recipe`. |
| 9 | The calculation returns the total spray volume and the total amount per product only. No tank split. |
| 10 | Editable until the task starts; frozen and archivable afterwards. |
| 11 | Valid as soon as it is created. No approval step. |

Detecting whether a task type requires a prescription uses an explicit
`TaskType.requiresPrescription` flag, not a name/description match.

Out of scope: R011 (weather at the moment of spraying) — the spec ties it to the
operator's spraying event, not to the agronomist. Mobile is untouched.

## Frozen contract

Enums:

```prisma
enum UserRole { ADMIN OPERARIO SUPERVISOR PRODUCTOR CONTRATISTA VETERINARIO INGENIERO }
enum PrescriptionStatus { NO_REQUIERE SIN_RECETA CON_RECETA }
enum DosageBasis { POR_HECTAREA CONCENTRACION }
```

Schema additions:

```prisma
TaskType:   + requiresPrescription Boolean @default(false)
Task:       + prescriptionStatus PrescriptionStatus @default(NO_REQUIERE)
            + recipe Recipe?
Recipe:     + taskId String? @unique
            + pest String?
            + crop String?
            + reapplicationIntervalDays Int?
            + reapplicationDate DateTime?
RecipeItem: + dosageBasis DosageBasis @default(POR_HECTAREA)
```

Domain rule: `recipe.lotId` must equal `task.lotId`. `Recipe.lotId` is kept
because mobile and `GET /recipes?lotId=` depend on it.

Calculation:

- `sprayVolume` is a rate in `sprayVolumeUnit` (default `L/ha`).
- `caldoTotal` (L) = `sprayVolume` × `lot.area`.
- `POR_HECTAREA`: row total = `dose` × `lot.area`, expressed in the row `unit`.
- `CONCENTRACION`: `dose` is the amount per 100 L of water, so row total =
  `dose` × `caldoTotal` / 100, expressed in the row `unit`. A 1% v/v mix is
  entered as `1` L per 100 L.

Endpoints:

- `POST /recipes` → 201. Body `{ taskId, date, pest?, crop?, observations?,
  sprayVolume, sprayVolumeUnit, reapplicationIntervalDays?, reapplicationDate?,
  items: [{ inputId, dose, dosageBasis, unit?, loadOrder }] }`. Side effect:
  `task.prescriptionStatus = CON_RECETA`.
- `PUT /recipes/:id` → 200. Same body minus `taskId`. Rejected when the task has
  already started.
- `GET /recipes/:id` → unchanged shape plus the new fields and the computed
  totals.
- `GET /recipes?lotId=` → unchanged, additive fields only.
- `GET /tasks`, `GET /tasks/:id` → include `prescriptionStatus`.
- `GET /prescriptions/pending` → tasks with `prescriptionStatus = SIN_RECETA`
  for the caller's firma, with `lotName`, `farmName` and `taskTypeName`.

Roles: `POST`/`PUT /recipes` restricted to `INGENIERO` (and `ADMIN`). Reads open
to `ADMIN`, `SUPERVISOR`, `INGENIERO`, `OPERARIO`, `CONTRATISTA`.

## Tasks

- [x] B1 [backend] schema: `INGENIERO` role, `PrescriptionStatus`, `DosageBasis`,
      `TaskType.requiresPrescription`, `Task.prescriptionStatus`, `Recipe.taskId`
      + pest/crop/re-application, `RecipeItem.dosageBasis`; hand-authored
      migration; `AUTH_USER_ROLES` mirror; seed (agronomist user, prescription
      flag on application task types, one pending and one prescribed task).
- [x] B2 [backend] prescription domain rules and the calculation, pure and unit
      tested: dosage basis validation, load order, lot/task consistency, freeze
      after the task starts, spray-volume and per-product totals.
- [ ] B3 [backend] recipe hexagon: `CreateRecipe` / `UpdateRecipe` use cases,
      ports, adapters, DTOs, and the missing `POST /recipes` / `PUT /recipes/:id`
      routing with role enforcement.
- [ ] B4 [backend] `GET /prescriptions/pending` and `prescriptionStatus` on task
      reads.
- [ ] W1 [web] `INGENIERO` in `MODULES_BY_ROLE`, `ROLE_LABELS`,
      `homePathForRole`, and the route guard.
- [ ] W2 [web] `/dashboard/recetas`: pending prescription inbox plus the
      navigation counter.
- [ ] W3 [web] prescription editor with the live spray-volume / dose panel and
      the re-application plan.
- [ ] W4 [web] Producción integration: sin receta / con receta badge, prescription
      view, edit while the task has not started.
- [ ] V1 verify: backend jest + `next build` + lint + honest reporting of what
      could not be run.

## Acceptance

- `pnpm --filter backend test` green, including new unit tests for the
  calculation and the domain rules.
- `prisma validate` and `prisma generate` green.
- `next build` green for the console.
- An `INGENIERO` can log in, see only the prescription module, find a pending
  task, write its prescription and see the computed totals.
- The task leaves `SIN_RECETA` and shows `CON_RECETA` in Producción.
- A prescribed task that already started rejects edits.
- No fabricated verification: anything that cannot be run in this environment is
  reported as not run, with the reason.

## Environment constraints

Postgres is not reachable in this workspace: the backend datasource points at
`localhost:5433`, nothing listens there, and the Docker daemon is not running.
Consequences:

- The migration is **authored, not applied** (this matches the repository's
  existing convention: `20260925130000_add_reception_validated_quantity` states
  "No migration is applied to any database by this change").
- Backend verification relies on the fully mocked jest suite (baseline: 92
  suites / 875 tests green with no database), plus `prisma validate`,
  `prisma generate` and `nest build`.
- DB-backed smoke tests and the console's live end-to-end flow are pending until
  Postgres on `5433` is available.

## Delivery

One branch, `RecetasFitosanitarias`, with one work-unit commit per task. No push,
no pull request, no merge — the owner opens the PR against main.

## Progress log

- Recon complete; plan and decisions approved by the owner.
- Environment baseline captured: backend jest green with no database; datasource
  `localhost:5433` unreachable. ODD doc created before the first source write.

### B1 — schema, role and seed (commit `e6e5c5a`)

Verification, run for real:

- `npx prisma validate`: `The schema at prisma\schema.prisma is valid`
- `npx prisma generate`: generated Prisma Client 7.8.0 into `prisma/generated`
- `pnpm test`: 92 suites / 875 tests, all passing
- `npx tsc --noEmit -p tsconfig.json`: exit 0
- `pnpm build` (`nest build`): exit 0

The role list was hardcoded in three places and widening the Prisma enum broke
compilation in the task module (`TS2416` in `prisma-user.reader.ts`). Fixed by
adding `INGENIERO` to `USER_ROLE_VALUES` in both `entities/user/application/user.types.ts`
and `entities/task/application/task.types.ts`, mirroring `AUTH_USER_ROLES`.

Independent verification (read-only, high risk tier because the commit touches
the auth hot path) returned PASS with no blockers. Non-blocking findings carried
forward:

1. `recipe.controller.ts` still gates reads with `@Roles('ADMIN','SUPERVISOR')`,
   so `INGENIERO` is 403 on `GET /recipes` until B3.
2. Next.js `modulesForRole` returns **every** module for a role it does not know,
   so an `INGENIERO` would see the whole sidebar until W1.
3. Next.js `api/client.ts` `UserRole` union is missing `INGENIERO` (stale typed
   boundary, runtime unaffected) — W1.
4. Future migrations must not both add and use an enum value in the same file:
   Prisma runs a migration file in one transaction and `55P04` would trigger.

Environment notes for the owner:

- The seed now requires a new `SEED_INGENIERO_PASSWORD` environment variable
  (no hardcoded fallback, same convention as `SEED_ADMIN_PASSWORD`). `db:seed`
  fails loudly without it.
- The migration is authored but NOT applied. To materialise it, bring Postgres
  up at `localhost:5433` and run `pnpm --filter backend db:reset` (or
  `migrate deploy`).
- `prettier --check` fails on untouched files too, so the repository is not
  Prettier-formatted. Formatting was deliberately NOT run: it is not convergent
  and would rewrite the whole repository.

### B2 — domain rules and the calculation

New: `entities/recipe/domain/spray-calculation.ts` (+ spec) and
`domain/dosage-basis.ts`. Extended: `domain/recipe.rules.ts` (+ spec),
`domain/errors.ts` (`PrescriptionFrozenError`),
`application/recipe.types.ts`.

Formulas: `caldoTotal = sprayVolume × lotArea`; `POR_HECTAREA` row =
`dose × lotArea`; `CONCENTRACION` row = `dose × caldoTotal / 100` (dose is the
amount per 100 L, so a 1% v/v mix is entered as `1`). Row totals use the exact
unrounded caldo and are then rounded, as is the caldo total, to 2 decimals.

Strict TDD evidence — captured BEFORE implementing (behavioural failures, not a
compile error): `Test Suites: 2 failed, 2 total / Tests: 82 failed, 46 passed,
128 total`. After implementing: `2 passed` / `128 passed`.

Verification re-run by the orchestrator:

- `pnpm test`: 93 suites / 958 tests, all passing (baseline was 92 / 875, so
  +1 suite and +83 tests, with no baseline test weakened)
- `npx tsc --noEmit -p tsconfig.json`: exit 0
- `pnpm build` (`nest build`): exit 0

The `PrescriptionFrozenError` has no HTTP mapping yet on purpose: the recipe
controller's `translate()` ends in `throw error` and still compiles, so
`PrescriptionFrozenError -> 409` is deferred to B3 as planned. New record fields
stay optional so the additive-only rule (R8) and the existing typed spec literals
keep working.
