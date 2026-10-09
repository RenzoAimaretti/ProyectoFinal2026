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

- Forecast: approximately 1,500 authored changed lines across five work units,
  excluding regenerated Prisma client and drift artifacts.
- Strategy: five task branches off `dev`, each one pull request into `dev`.
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

- [ ] **T02 — Unit integrity**
  - Route: delegated writer.
  - `enum InputUnit`; `Input.unit` typed by it; `Stock.unit` snapshot column;
    guard blocking a unit change when stock exists.
  - Migration normalising existing values to the enum members before the type change.
  - Check: focused tests for the guard and the snapshot; observed RED first.

- [ ] **T03 — Tenant input categories**
  - Route: delegated writer; multi-file.
  - `InputCategory` model, backend hexagonal module (ports, use cases, adapters,
    composition root), `Input.categoryId` required FK.
  - Per-tenant default seeding plus a migration backfill for existing tenants.
  - Check: focused module tests; backfill verified against the local database.

- [ ] **T04 — Labour-category assignment**
  - Route: delegated writer.
  - `LaborTypeCategory` join table with `@@id([laborTypeId, categoryId])`; admin
    assignment in the labour-type form and the nextjs screens.
  - Check: focused tests; assignment round-trip through the API.

- [ ] **T05 — Mobile filter**
  - Route: delegated writer.
  - `Inputs.categoryId` column in drift, mapper, DAO query filtering by the
    labour's categories, picker warning for a forced out-of-set value.
  - Check: `flutter test`; regenerated drift code committed.

## Acceptance

- An admin can create, rename, and delete categories per tenant, and the defaults
  exist after provisioning.
- An input belongs to exactly one category.
- A labour type admits a set of categories, assigned manually by the admin.
- The mobile picker filters inputs by the selected labour's categories and shows a
  warning — but does not block — when an out-of-set category is forced.
- Changing an input's unit is refused once it has stock; existing balances keep
  their recorded unit.
- No remaining `TaskType` reference in schema, backend, or nextjs.
- `pnpm --filter backend test` green, nextjs typecheck green, `flutter test` green.

## Progress log

- Plan written; no implementation started.
- T01 done and committed as `1d2f513` on `refactor/labor-type-rename`.
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
