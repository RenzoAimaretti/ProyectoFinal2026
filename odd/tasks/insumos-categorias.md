# ODD — insumos-categorias

> Organic Driven Development feature document.
> Engram mirror: `odd/insumos-categorias/tasks`

## Objective

Let each tenant classify its inputs (insumos) with categories it owns and names
itself, and filter the daily-report input picker by the categories admitted by
the labour being reported — so an operator can no longer load a seed into a
spray job. Along the way, fix the unit integrity hole on stock and align the
backend naming with the mobile client (`TaskType` -> `LaborType`).

## Problem

`Input` carries only `name` and `unit`, so nothing can be filtered: the mobile
picker passes every input to the options list with no `where` clause
(`packages/mobile/lib/data/services/tables/catalog_tables.dart:86-99`,
`packages/mobile/lib/app/reports/daily_report_form_view.dart:390-404`). There is
no association between a labour type and any set of inputs anywhere in backend,
mobile, or nextjs. Inputs are also a tenant-owned catalogue and nothing in the
schema records which taxonomy a tenant works with.

Two adjacent defects surfaced during exploration and are folded into this slice:

1. `Stock` has no `unit` column (`packages/backend/prisma/schema.prisma:401-413`),
   so a stock balance inherits `Input.unit` implicitly — and `PUT /inputs/:id`
   allows changing that unit (`packages/backend/src/entities/input/application/use-cases/update-input.use-case.ts:31-32`).
   Editing one input's unit retroactively reinterprets every existing balance.
2. The backend model is `TaskType` while the mobile drift table is already
   `LaborTypes` with `@DataClassName('LaborType')`
   (`packages/mobile/lib/data/services/tables/catalog_tables.dart:70-84`).

## Decisions (locked)

| # | Decision | Value |
|---|---|---|
| D01 | Category ownership | Tenant-owned table `InputCategory`; each tenant creates and renames its own. |
| D02 | Categories per input | Exactly one. Schema-level `Input.categoryId`; no M2M on the input side. |
| D03 | Default taxonomy | Seeded per tenant from the previously proposed list; the admin may rename, delete, or add. |
| D04 | Enforcement this sprint | Filter + visible warning. The server accepts a forced out-of-set category. |
| D05 | Labour <-> categories | A labour admits a **set** of categories (`LaborTypeCategory` M2M), assigned manually by the admin in the labour-type form. |
| D06 | Unit | `Input.unit` becomes `enum InputUnit`; `Stock` snapshots `unit`; unit changes are blocked once the input has stock. |
| D07 | Naming | `TaskType` -> `LaborType` across schema, backend, and nextjs. |

Rationale for D05: a real spray job mixes categories (herbicide + adjuvant always,
insecticide sometimes), so a single category per labour would block legitimate
work. Rationale for D04: a hard block on an offline client with a wrong rule
stops field work, and a rejected `POST /daily-reports` has no dead-letter policy
today, so it would strand the report in the outbox.

## Scope

### Authorized implementation

- Rename `TaskType` to `LaborType` in the Prisma schema, backend module, HTTP
  route, and the nextjs admin API client and screens; regenerate tracked artifacts.
- `enum InputUnit`, `Stock.unit` snapshot, and a guard against changing an
  input's unit while it holds stock.
- `InputCategory` tenant catalogue with per-tenant default seeding and a backfill
  for existing tenants; `Input.categoryId` as a required single FK.
- `LaborTypeCategory` join table plus admin assignment in the labour-type form.
- Mobile: category column in drift, mapper, DAO filter, and the picker filtering
  by the labour's categories with a visible warning for a forced value.

### Pending explicit product/team decisions

None outstanding. D01-D07 above are closed and implementation may proceed.

### Out of scope

- The versioned catalogue pull/delta sync (still marked Sprint 2). Until it
  exists, a new `Input` field reaches devices only through the development seed
  (`packages/mobile/lib/data/services/catalog_seeder.dart`).
- The `RecipeItem.unit` nullability inconsistency and `sprayVolumeUnit`.
- Any change to reception validation semantics.
- `packages/web` (single-file stub, not a client).

## Constraints

- Follow `docs/hexagonal-conventions.md`: domain stays free of NestJS, Prisma,
  and HTTP; Prisma only in `adapters/outbound/**`; the NestJS module is the
  composition root.
- Preserve the existing `Tenant`/`Company` model and all tenant scoping.
- Generated artifacts are tracked: `packages/backend/prisma/generated` (35 files)
  and `packages/mobile/lib/**/*.g.dart` (16 files) must be regenerated and committed
  with the schema change. `packages/backend/dist` is NOT tracked.
- Preserve pre-existing worktree changes: `.atl/.skill-registry.cache.json`,
  `.atl/skill-registry.md`, `.gitignore`, `.codegraph/`, `openspec/config.yaml`.
  Do not commit them.
- Do not rename the existing historical migrations. Add new ones.
- No push, PR creation, or merge without a separate explicit request. Each work
  unit closes with one Conventional Commit on its task branch.

## Authorized scope

`packages/backend/src/**`, `packages/backend/prisma/**`, `packages/nextjs/src/**`,
`packages/mobile/lib/**`, and this feature document.

## Route per task

Per the repository branching policy (see `AGENTS.md`, "Branching and Review
Flow"): cut each task branch from an up-to-date `dev`, land it in `dev` by pull
request, and promote `dev` to `main` only once the whole sprint is reviewed and
tested.

Work-unit ordering rationale: the rename goes first. `LaborTypeCategory` is named
after `LaborType`; building it against `TaskType` and renaming afterwards means
writing that table twice and dragging a 240-reference rename across new code.
The rename is pure mechanical work on a tree that has no category code yet.

## Delivery

- Forecast: approximately 2,000 authored changed lines across six work units,
  excluding regenerated Prisma client and drift artifacts.
- Strategy: six task branches off `dev`, each one pull request into `dev`.
- Each task ends with a focused verification record and one Conventional Commit.

## TDD and checks

- TDD mode: test-first where a deterministic runner exists and the expected
  outcome is clear; the rename is a mechanical refactor with no new behaviour and
  is verified by the existing suite staying green.
- Backend runner: `pnpm --filter backend test -- <focused Jest paths>`.
- Migration check: `pnpm --filter backend exec prisma migrate dev` against the
  local Docker Postgres, then `pnpm --filter backend exec prisma generate`.
- Nextjs check: typecheck/build from `packages/nextjs`.
- Mobile runner: `flutter test` in `packages/mobile`; `dart run build_runner build`
  for the drift regenerated file.
- Intended checks per work unit: focused unit/adapter/module tests, schema-level
  spec, and boundary-import verification.

## Tasks

- [x] **T01 — Rename TaskType to LaborType**
  - Route: delegated writer; multi-file mechanical rename.
  - Prisma model, `Task`/`DailyReport` FK fields, module directory, HTTP route
    `/task-types` -> `/labor-types`, backend types/ports/use cases/adapters,
    nextjs `api/client.ts` and the screens that reference it.
  - New migration renaming the table and the FK columns; regenerate artifacts.
  - Check: existing backend suite green; no `/task-types` reference left.
  - **Done.** Commit `1d2f513` on `refactor/labor-type-rename`: 70 files,
    +2843/-2821. Migration `20261009135458_rename_task_type_to_labor_type`.
    Evidence: backend suite 92 suites / 875 tests green before and after;
    `nest build` exit 0; zero `TaskType|taskType|task_type|task-types`
    references in backend `src`, `schema.prisma`, or nextjs `src`; full
    migration chain applied from an empty database with
    `prisma migrate diff` reporting "No difference detected" against
    `schema.prisma`; a scratch database holding live `TaskType`/`Task` rows
    kept every row, value, and foreign key across the rename, with constraints
    renamed. User-facing message strings and their assertion renamed too.
  - Next.js consumer now verified by its compiler: `pnpm install` (lockfile
    unchanged) followed by `pnpm --filter nextjs build` completes green across
    all 17 routes, with type checking active (`next.config.ts` sets neither
    `ignoreBuildErrors` nor `ignoreDuringBuilds`).
  - Merged into `dev` as `2bc3028` (pull request #3).

- [x] **T02 — Unit integrity**
  - Route: delegated writer; strict TDD for the guard and the stock snapshot.
  - `enum InputUnit` with members `L`, `KG`, `UNIT` — the exact vocabulary the
    mobile unit dropdown already hardcodes (`_unitsDummy`) and the only values
    the seeds use. Adding a member later is `ALTER TYPE ... ADD VALUE`, which is
    non-destructive and needs no data migration, so no speculative members.
  - `Input.unit` becomes `InputUnit`; `Stock` gains a required `unit` snapshot
    column backfilled from the catalogue at migration time.
  - Guard: `PUT /inputs/:id` refuses a unit change while the input has a stock
    balance with a non-zero quantity. A zero balance carries no unit-denominated
    value and may be corrected, so the reception upsert writes `unit` on both the
    create and the increment, which repairs a stale zero row and cannot relabel a
    non-zero one because the guard keeps them equal.
  - Migration must normalise before the cast and fail loudly on any value outside
    the vocabulary rather than silently mislabelling it. Today the repository
    spells the same concept two ways: `'kg'` in `packages/backend/prisma/seed.ts`
    and `'KG'` in the mobile seeder.
  - Domain type follows the existing per-module pattern of
    `entities/reception/domain/reception-status.ts`: the domain must not import
    generated Prisma types. Cross-entity read goes in a narrow reader port
    following the existing `*input.reader.ts` convention.
  - Stock responses must return the row's own `unit` instead of joining the
    catalogue, otherwise the snapshot is pointless on reads.
  - Out of scope, recorded as follow-ups: `ReceptionItem.unit`,
    `DailyReportItem.unit`, `RecipeItem.unit`, and `Recipe.sprayVolumeUnit`
    remain free `String`, and the daily-report approval path still decrements a
    balance using a client-supplied item unit.
  - Check: observed RED for the guard and the snapshot before GREEN; focused
    tests; migration verified by the same empty-database chain and drift check
    used for T01.
  - **Done.** Commit `9c80310` on `fix/input-unit-integrity`: 30 files,
    +464/-103. Migration `20261009160000_add_input_unit_enum_and_stock_unit`.
    Evidence: backend suite 92 suites / 875 tests before and 93 / 882 after;
    `nest build` exit 0; chain of 5 migrations applied from an empty database
    with `prisma migrate diff` reporting "No difference detected"; a scratch
    database holding `'L'` and `'kg'` catalogue rows plus their balances kept
    every row, turned `'kg'` into `KG`, and matched each `Stock.unit` to its
    input; a scratch database holding `'POUND'` failed the migration naming that
    value. Merged into `dev` as `8e7d1eb` (pull request #4).

- [x] **T03 — Tenant input categories**
  - Route: delegated writer; multi-file; test-first for tenant isolation.
  - `InputCategory` is a tenant-owned catalogue and must mirror the
    `entities/labor-type/` module, the closest sibling: `domain/errors.ts`,
    `application/{ports,types,validation,use-cases}`, a Prisma repository under
    `adapters/outbound/`, and the controller and composition root at the module
    root. Route `/input-categories`, registered in `app.module.ts`.
  - Fields `id`, `tenantId`, `name`, `active`, `createdAt`, `updatedAt`,
    `version`, `deleted`, with `@@unique([tenantId, name])` and
    `@@index([tenantId])`. The `version`/`deleted` pair exists for the versioned
    catalogue pull, which is still unbuilt, so it is carried for consistency with
    the other catalogues rather than used.
  - No stable `code` or `key` column. Nothing in the agreed scope needs to
    identify a category programmatically, and the tenant may rename any of them.
  - `Input.categoryId` is a required FK. Create AND update must verify the
    referenced category belongs to the same tenant, otherwise the endpoint
    becomes a cross-tenant reference oracle.
  - The eight defaults, named in Spanish to match the seeded domain data
    (`'Glifosato 48%'`, `'Cosecha'`): Semilla, Fertilizante, Herbicida,
    Insecticida, Fungicida, Coadyuvante, Inoculante, Otro.
  - Generation path: `prisma migrate dev --create-only` works again now that the
    local drift is resolved. Generate the DDL so that table, index, and foreign
    key names match Prisma's expectations, then HAND-EDIT only the
    `Input.categoryId` part: Prisma emits `ADD COLUMN ... NOT NULL`, which fails
    on existing rows, so it must become nullable, be backfilled, and only then
    be set `NOT NULL`. Append the defaults backfill: one row per existing tenant
    per default name, and every existing input assigned to that tenant's `Otro`.
  - The default names therefore exist twice, in the migration SQL and in the
    seed. Keep them in one exported constant used by the seed and cross-reference
    it in a migration comment, because the migration cannot import TypeScript.
  - Delete policy: a category that still has inputs must not be removable.
  - Out of scope: labour-category assignment (T04) and the mobile filter (T05).
  - Check: focused module tests including the cross-tenant rejection; the
    migration chain from an empty database; `migrate diff` reporting no drift;
    and the backfill proven on a scratch database holding a tenant with inputs.
  - **Done.** Commit `447681b` on `feat/tenant-input-categories`: 38 files,
    +2547/-29. Migration `20261009152647_add_input_categories`. Evidence:
    backend suite 93 suites / 882 tests before and 94 / 888 after; `nest build`
    exit 0; all 7 migrations applied from an empty database with
    `prisma migrate diff` reporting "No difference detected", which is what
    proves the hand-edited SQL matches the Prisma schema; on a scratch database
    holding two tenants and three inputs, each tenant received exactly its own
    eight defaults and every input was assigned to its own tenant's `Otro`, with
    zero cross-tenant assignments.
  - The delegated writer could not run the scratch-database proofs because its
    safety boundary forbids reading the database password from `.env`, so those
    two proofs were executed by the parent. Everything else was delivered and
    verified.

- [x] **T04 — Labour-category assignment (backend only)**
  - Route: delegated writer; test-first for tenant isolation and replace
    semantics.
  - `LaborTypeCategory` join table with `@@id([laborTypeId, categoryId])` and
    `onDelete: Cascade` on both foreign keys, matching how `RecipeItem` and
    `DailyReportItem` cascade from their parent. `LaborType` and `InputCategory`
    each gain the back-relation.
  - `GET /labor-types/:id/categories` returns the assigned categories in the same
    shape the input-category list endpoint returns.
    `PUT /labor-types/:id/categories` replaces the whole set, which keeps it
    idempotent: the body is the complete desired set, not a delta.
  - Both endpoints resolve the labour type inside the caller's tenant, and every
    `categoryId` in the body must belong to that same tenant. Otherwise the
    endpoint becomes a cross-tenant reference oracle, exactly as in T03.
  - An empty set means the labour has NO configured restriction, so the picker
    shows every input. This is deliberate: every labour type that already exists
    starts with no assignments, and the opposite reading would silently block
    every existing labour.
  - The admin screens are NOT in this work unit. The admin has no labour-type form
    and no input-creation form, so there is nowhere to put the selector; that work
    moved to T06.
  - Out of scope: the mobile filter (T05) and the admin screens (T06).
  - Check: focused tests for the cross-tenant rejection, the replace semantics,
    and the empty-set case; the migration chain from an empty database;
    `migrate diff` reporting no drift; the join table proven on a scratch
    database holding two tenants.
  - **Done.** Commit `e5428ff` on `feat/labor-type-categories`: 23 files,
    +2025/-7. Migration `20261009154422_add_labor_type_categories`. Evidence:
    backend suite 94 suites / 888 tests before and 97 / 894 after; `nest build`
    exit 0; all 8 migrations applied from an empty database with
    `prisma migrate diff` reporting "No difference detected"; on a scratch
    database a duplicate assignment was rejected by
    `LaborTypeCategory_pkey`, and deleting either the labour type or the
    category removed the join rows through the cascade.
  - The delegated writer reported a compile error (`TS2307: Cannot find module`)
    as its RED evidence, which is not a behavioural RED: the test never ran to
    fail on an assertion. The parent read the assertions instead and confirmed
    they pin the behaviour, including that a foreign category leaves the existing
    set untouched because the replace call is never reached.

- [x] **T05 — Mobile filter**
  - Route: delegated writer.
  - `Inputs.categoryId` column in drift, mapper, DAO query filtering by the
    labour's categories, picker warning for a forced out-of-set value.
  - Depends on T04's assignments reaching the device, and the versioned catalogue
    pull still does not exist, so this task has to settle how the labour-to-
    categories mapping gets offline at all.
  - Check: `flutter test`; regenerated drift code committed.
  - **Done.** Commit `b2ae81e` on `feat/mobile-input-picker-filter`: 26 files.
    Drift schema 4 with an explicit upgrade step, a pure-domain compatibility
    rule, a nullable `inputs.category_id`, the seeder carrying the same eight
    categories and assignments as the backend, and the picker marking
    out-of-set choices while keeping them selectable with an amber warning.
  - Evidence: the mobile suite goes from **156 tests on `dev` to 166 here**, all
    passing; `flutter analyze` adds no finding beyond the `use_super_parameters`
    info the repository already carries in eighteen places, older DAOs included;
    the domain boundary test still passes. The compatibility tests are named for
    the two product rules, "empty admitted set permits every input" and "unknown
    input category remains compatible".
  - **The labour is not chosen in this form.** The form has no labour picker: the
    labour comes from the task being reported, so the filter keys off
    `task.laborTypeId`. That is simpler and more faithful than a picker would
    have been, and it is why the filter could be built at all without touching the
    form's flow.
  - **Not covered: the version 3 to 4 upgrade itself.** Reproducing a version 3
    database faithfully needs drift's schema-verification tooling (`drift_dev
    schema` plus a `schema_dir` and `SchemaVerifier`), which this project does not
    configure, and SQLite refuses `ALTER TABLE ... DROP COLUMN` on a column that
    takes part in a foreign key, so a hand-rolled rollback cannot stand in for it.
    The new test covers the declared schema and the foreign-key enforcement
    instead. Setting that tooling up is its own task.
  - **Still true: the feature cannot work in production yet.** The versioned
    catalogue pull does not exist, so the categories and the labour-to-category
    assignments reach a device only through the development seeder. Against real
    tenant data the filter has nothing to read.

- [x] **T06 — Admin screens for categories and labour types**
  - Route: delegated writer; frontend work.
  - Discovered while scoping T04: the admin client exposes only `apiGet` for
    `/labor-types` and `/inputs`. It has no write call for either resource, no
    labour-type screen, and no input-creation form, so both T03 and T04 are
    unreachable from the UI as merged.
  - Needs a categories screen over the `input-categories` endpoints (list, create,
    rename, deactivate), a labour-type screen (list, create, edit) over the
    labour-type endpoints, and a category multi-select wired to
    `PUT /labor-types/:id/categories`.
  - Check: `pnpm --filter nextjs build` green with type checking active; the flows
    exercised against the local backend.
  - **Done.** Commit `46f4194` on `feat/admin-catalog-screens`: 6 files, +335.
    Two screens (`/dashboard/categorias`, `/dashboard/labores`), a reusable
    `CheckboxGroup` added to the form kit, `catalogErrorMessage` reading Nest's
    domain message out of the response body, and `InputDTO` extended with the
    `categoryId` that `GET /inputs` has been returning since T03.
  - Evidence: `pnpm --filter nextjs build` exit 0 with both new routes
    prerendered and type checking active; `pnpm --filter nextjs lint` reports
    seven errors and three warnings, all pre-existing in unrelated files
    (`scroll`, `ganadero`, `maquinaria`, `mi-campo`, the dashboard index,
    `personal`, `reveal`), none in a changed file. The API contract the screens
    assume was read from the controllers rather than executed: `GET /inputs`
    returns `InputRecord` including `categoryId`, the assigned categories come
    back as full records including `active`, and the backend sets no global route
    prefix.
  - **Runtime verification, partially closed.** `SEED_ADMIN_PASSWORD` was set for
    the local machine, the seed was run, and the backend was started on the port
    the admin expects. Every call the two screens make was then executed over HTTP
    against that running backend: the eight defaults came back with `active`, the
    five inputs came back with `categoryId`, assigning two categories to a labour
    returned both ordered by name, replacing the set dropped the removed one, an
    empty array cleared it, creating, renaming, and deactivating a category
    worked, a duplicate name answered 409 with the body message
    `Input category already exists`, and deleting a category that still has inputs
    answered 409 with `Input category still has inputs`, which is precisely what
    the screens surface instead of a generic failure.
  - **Still open: the rendered UI was never seen.** Both routes answer 200 with a
    clean server log and both are compiled into the build, but they are client
    components behind `useRequireAuth`, so the server-side HTML is only the auth
    shell, and no browser tooling exists in this environment to execute the page.
    `packages/nextjs` has no test runner either, so the click paths and the visual
    result remain covered by review alone.
  - The seed is destructive by design: it wipes twenty-one demo tables in reverse
    foreign-key order inside one transaction and preserves only the tenant, firm,
    user, and membership bootstrap rows. It deliberately does NOT wipe
    `inputCategory`, which is right for a tenant-owned catalogue.
  - Also found while doing this: `pnpm --filter backend start:prod` cannot work.
    The script runs `node dist/main`, but because the TypeScript config includes
    `prisma/`, the compiled entry point lands at `dist/src/main.js`. The backend
    was started with the real path for this verification. Recorded as a follow-up.
  - Sidebar visibility relies on `MODULES_BY_ROLE` mapping a role to allowed
    labels: only ADMIN and SUPERVISOR receive `"all"`, so the two new entries stay
    hidden from the roles the API forbids from writing. The non-admin allowlists
    were deliberately left untouched.

## Acceptance

- An admin can create, rename, and deactivate categories per tenant. Defaults
  are created by the migration for tenants that already exist and by the seed for
  the seeded tenant; the repository has no runtime tenant-provisioning path, so
  any future provisioning flow must create them itself. The API for this landed in
  T03, but it is only reachable from the UI once T06 ships.
- An input belongs to exactly one category.
- A labour type admits a set of categories, assigned manually by the admin through
  `PUT /labor-types/:id/categories` (T04). The admin screen for that assignment is
  T06. An empty set means no restriction, not no inputs.
- The mobile picker filters inputs by the selected labour's categories and shows a
  warning — but does not block — when an out-of-set category is forced.
- Changing an input's unit is refused once it has stock; existing balances keep
  their recorded unit.
- No remaining `TaskType` reference in schema, backend, or nextjs.
- `pnpm --filter backend test` green, nextjs typecheck green, `flutter test` green.

## Progress log

- Plan written; no implementation started.
- T01 done and committed as `1d2f513` on `refactor/labor-type-rename`, plus
  `d3f2506` for this document. Opened as pull request #3 against `dev`.
  Independent verification closed four of six risk areas: backend suite and
  build green, commit hygiene clean, no leftover live consumer.
- Known residue after T01: prose describing the old route survives in
  `odd/tasks/web-produccion-timeline.md:17` and
  `openspec/specs/multi-tenant-enforcement/spec.md`; both are documents, not
  runtime consumers, and were left untouched.
- The Next.js gap is closed: the admin compiles and builds against
  `/labor-types` and the renamed DTO fields. No open verification gap remains
  for T01.
- Recorded on this branch: `c5e1f70` adds this plan document, `1d2f513` is the
  rename itself. `pnpm install` was run, so `packages/nextjs/node_modules` now
  exists; `pnpm-lock.yaml` was not modified.
- T02 done and committed as `9c80310` on `fix/input-unit-integrity`.
- Merging #3 then #4 conflicted, as predicted, on five files: the tracked Prisma
  client plus `schema.prisma` and `seed.ts`. `schema.prisma` and `seed.ts`
  auto-merged with both sets of edits intact, which was verified by inspecting the
  merged result rather than trusting the auto-merge. The generated client cannot
  be reconciled by hand resolving one file, because it has to reflect both
  changes at once, so the merge was completed locally and the client regenerated
  with `prisma generate` from the merged schema.
- The local database drift is gone. After both merges the local database reports
  6 migrations, up to date, and `prisma migrate diff` reports no difference
  against the merged schema, which also means `prisma migrate dev` works again.
  This is why T03 can generate its migration instead of hand-writing it.
- T03 done and committed as `447681b` on `feat/tenant-input-categories`.
- The migration was generated with `prisma migrate dev --create-only`, which only
  became possible once the drift was gone, so the DDL names are Prisma's own. Only
  the `Input.categoryId` part was hand-edited, into nullable, backfill, and
  `SET NOT NULL`, because Prisma emits a single `NOT NULL` add that fails on
  existing rows.
- Default category names live in `prisma/input-category-defaults.ts`, imported by
  the seed, and are referenced by name in a migration comment. The migration
  cannot import TypeScript, so the list is necessarily written twice; the
  deliberate choice was to keep one authoritative constant and point the SQL at it
  rather than let two silent copies drift.
- The repository has no runtime tenant-provisioning path, only
  `prisma/seed.ts`. Defaults therefore reach existing tenants through the
  migration backfill and the seeded tenant through the seed. Any future
  provisioning flow has to create them itself.
- T05 done and committed as `b2ae81e` on `feat/mobile-input-picker-filter`.
- **Blocker found and fixed before T05 could start: this machine's Flutter was too
  old for the project.** The committed `pubspec.lock` declares
  `dart: ">=3.13.0 <4.0.0"` and `flutter: ">=3.44.0"` through `drift_flutter
  0.3.1` and `sqlite3_flutter_libs 0.6.0+eol`, while the machine had Flutter
  3.35.4 and Dart 3.9.2. No Flutter command worked at all: not `pub get`, not
  `test`, not `analyze`, not `build_runner`. `flutter upgrade` moved it to 3.47.7
  and `pubspec.lock` came back unchanged, which confirms the lock was right and
  only the SDK was stale. Anyone working on mobile needs Flutter at or above
  3.44.
- The delegated writer had reported its work as partial for exactly this reason,
  with a compile error standing in for a behavioural RED, which is the second time
  in this sprint that a writer's self-report needed auditing.
- **Lesson taken:** checking that a tool exists is not checking that it satisfies
  the project. `flutter --version` was read earlier and taken as readiness without
  comparing it to the constraint the lockfile already declared.

## Close

Closed on `dev` at `85e2a09`. **The promotion of `dev` to `main` is deliberately
NOT done here.** By the maintainer's decision it happens once the whole team's
sprint concludes, not when this feature slice ends.

### Verification on the merged state

| Check | Result |
| --- | --- |
| `pnpm --filter backend test` | 894 tests passing |
| `pnpm --filter backend exec nest build` | exit 0 |
| `npx prisma migrate status` | 8 migrations, schema up to date |
| `prisma migrate diff --exit-code` | "No difference detected", exit 0 |
| `pnpm --filter nextjs build` | compiled, type checking active, both new routes present |
| `flutter test` | 166 tests passing |
| `flutter analyze` | 43 findings, all pre-existing `info`; none introduced |
| All six task branches | merged into `dev` |

### End-to-end checks run against a live backend

These were executed over HTTP with a seeded admin, not merely unit tested:

- The eight defaults come back with `active`, the five inputs come back with
  `categoryId`, and the six labour types list.
- Assigning two categories to a labour returns both; replacing the set removes the
  dropped one; an empty array clears it.
- Creating, renaming, and deactivating a category works; a duplicate name answers
  409 with `Input category already exists`; deleting a category that still has
  inputs answers 409 with `Input category still has inputs`.
- **Cross-tenant rejection, the security control.** A category id belonging to a
  second tenant, created for the test, was refused with 404 and the same message a
  missing id produces, so the endpoint does not reveal whether an id exists
  elsewhere. Critically, the labour's existing set was left **untouched** rather
  than cleared. Creating an input with that category was refused the same way.
- **The unit guard.** Changing the unit of an input that holds stock answers 400
  with `Cannot change the unit of input ...: it has a non-zero stock balance`, and
  the stored unit is unchanged. Because every seeded input carries stock, an input
  with none was created for the complementary check: its unit changed with HTTP
  200, so the guard does not over-block. Both were reverted afterwards.

### Acceptance, assessed honestly

| Criterion | State |
| --- | --- |
| An admin can create, rename, and deactivate categories | API verified end to end; the screens shipped in T06 but were never clicked through in a browser |
| Defaults exist for existing and seeded tenants | Met: migration backfill proven on a scratch database with two tenants, and the seed |
| An input belongs to exactly one category | Met: required foreign key, no drift |
| A labour type admits a set of categories | Met, and verified end to end including the cross-tenant refusal |
| An empty set means no restriction | Met in both the mobile rule and its tests |
| The mobile picker warns without blocking | Implemented and unit tested; never exercised on a device |
| Changing a unit is refused once it has stock | Met, verified end to end in both directions |
| No remaining `TaskType` reference | Met |
| All three suites green | Met |

### Open items carried into the next slice

1. **The versioned catalogue pull does not exist**, so T05's filter is inert
   against real data. This is the single biggest gap: the mobile feature is
   correct and unreachable, because nothing carries categories or assignments to
   a device except the development seeder.
2. **T06's screens have no automated coverage** and were never rendered in a
   browser. `packages/nextjs` has no test runner and no browser tooling was
   available in this environment.
3. **T05's version 3 to 4 drift upgrade is untested.** Needs drift's
   schema-verification tooling, which the project does not configure.
4. **`pnpm --filter backend start:prod` is broken**: the script runs `node
   dist/main` but the compiled entry point is `dist/src/main.js`.
5. **The daily report approval path still decrements a stock balance using a
   client-supplied item unit**, which is the same class of hole T02 closed on the
   catalogue path.
6. `ReceptionItem.unit`, `DailyReportItem.unit`, `RecipeItem.unit`, and
   `Recipe.sprayVolumeUnit` remain free `String`.
7. `MODULES_BY_ROLE` keys module visibility on the sidebar **label**, so renaming
   a label silently changes permissions for the non-admin roles.
8. `InputCategory.findAllByTenantId` does not filter `deleted`, unlike the labour
   reader. Latent only, because the delete path is a hard delete.
9. `next dev` writes `packages/nextjs/AGENTS.md` and `CLAUDE.md`, which compete
   with the root `AGENTS.md` that declares itself the single source of truth.
   `agentRules: false` disables it.
10. Working on mobile needs **Flutter at or above 3.44**; this machine was on
    3.35.4 and no Flutter command ran until it was upgraded to 3.47.7.
11. Prose describing the removed `/task-types` route survives in
    `odd/tasks/web-produccion-timeline.md` and the archived OpenSpec specs.

### State of the local development database

The interactive verification of the T06 screens left two visible traces, which
are themselves evidence those flows worked: the category `Fertilizante` is now
named `Fertilizantessss` (rename exercised) and `Semilla` is gone (delete
exercised, allowed because it had no inputs). Re-running the seed restores the two
missing defaults, since the seed upserts all eight by name, and leaves the renamed
one as a ninth. The seed is destructive by design, so that costs the demo data and
rebuilds it.
- Scoping T04 surfaced that the admin cannot administer any of this: its API
  client exposes only `apiGet` for `/labor-types` and `/inputs`, there is no
  labour-type screen, and there is no input-creation form. T04 was therefore cut
  down to the backend, and T06 was added for the admin screens.
- T04 done and committed as `e5428ff` on `feat/labor-type-categories`.
- T06 done and committed as `46f4194` on `feat/admin-catalog-screens`. It was
  taken before T05 because the backend it drives is already merged and stable,
  while T05 cannot work in production until the versioned catalogue pull exists.
- The frontend has no automated coverage and no browser tooling was available in
  the session, so T06 is verified by type checking, lint scoping, and reading the
  controllers. That is weaker than everything else in this sprint, and the gap is
  recorded in the task entry rather than glossed over.
