# Backend New-Entity Hexagons

## Objective
Implement the domain and hexagonal backend modules for Prisma-only entities while preserving existing contracts and multi-firma isolation.

## Problem and rationale
The required entities exist as Prisma models but lack the feature-level application boundaries established by the migrated entity modules. The implementation must introduce only meaningful domain behavior, keep infrastructure at adapter edges, and retain the current public API surface.

## Scope
- Client, Input
- Recipe and RecipeItem
- DailyReport and DailyReportItem
- Reception and ReceptionItem, Stock
- Photo, MachineActivity

## Constraints
- Follow `docs/hexagonal-conventions.md` and the existing `farm` feature pattern.
- No new public endpoints without a separately approved contract decision.
- `Client` and `Input` are tenant-scoped.
- `DailyReport` and `MachineActivity` are company-scoped; the company belongs to `DailyReport`, not `Task`.
- Stock balances are client-scoped, not company-scoped.
- Web-only reception validation; mobile may only create `PENDING_VALIDATION`.
- Preserve unrelated local modifications in `.atl/`, `.gitignore`, `.codegraph/`, and `openspec/config.yaml`.

## Delivery
- Forecast: approximately 1,450 authored changed lines across five work units.
- Strategy: feature-branch chain. Keep each slice as a reviewable commit on `feat/multifirma-schema`; do not create PRs unless requested.
- Each task ends with a focused verification record and one Conventional Commit on `feat/multifirma-schema`.
- Stop after each completed slice for explicit human review before beginning the next slice.

## TDD and checks
- TDD mode: strict, explicitly selected by the user.
- Runner: `pnpm --filter backend test -- <focused Jest paths>`; require observed RED, GREEN, then refactor.
- Intended checks per work unit: focused backend unit/adapter/module tests, TypeScript/lint checks available from project scripts, and boundary-import verification.

## Tasks

- [x] **T01 — Catalog hexagons: Client and Input**
  - Route: delegated direct; multi-file write trigger.
  - Implemented tenant-scoped ports, application types/use cases, Prisma outbound adapters, composition modules, and meaningful tests.
  - Evidence: `97aaaf2` adds the modules; `d9a20ed` makes outbound updates atomically tenant-scoped through `updateMany({ where: { id, tenantId } })`.
  - Checks: strict-TDD RED observed; focused Jest passed (6 suites, 41 tests); TypeScript passed; independent verifier found and then confirmed the atomic-update correction.
  - Review: native committed-range assessment was unavailable because unrelated untracked paths require an explicit inventory selection. Native inspect also sees only unrelated dirty tracked paths; human slice review is pending.
  - Review workload: 1,475 authored lines across the two commits, above the target. Keep as a documented size exception unless the user authorizes history rewriting to split the already-created slice.

- [x] **T02 — Recipe aggregate hexagon**
  - Route: delegated direct; multi-file write trigger.
  - Implemented R009 through domain rules, application ports/use cases, Prisma adapters, Recipe module composition, and a versioned Prisma schema/migration.
  - Evidence: `050b681` adds aggregate behavior, Recipe spray-volume persistence, generated Prisma client output, and migration `20260925120000_add_recipe_spray_volume`.
  - Checks: strict-TDD RED/GREEN observed; focused Jest passed (5 suites, 84 tests); TypeScript and `prisma validate` passed; independent verification found no code findings.
  - Migration premise: user confirmed the target Recipe table is empty; no migration was applied to a database.
  - Review: native committed-range assessment was unavailable because unrelated untracked paths require an explicit inventory selection. Human slice review is pending.
  - Review workload: 1,570 authored lines, above the target. Keep as a documented size exception unless the user authorizes history rewriting to split the already-created slice.

- [x] **T03 — Company-scoped operational hexagons**
  - Route: delegated direct; multi-file write trigger.
  - Status: complete. User accepted the two documented review-size exceptions.
  - Evidence: `0a2365a` adds the DailyReport/items hexagon; `a9c16a3` adds the MachineActivity hexagon.
  - Checks: strict-TDD RED/GREEN observed; focused tests passed (DailyReport 5 suites/53 tests; MachineActivity 5 suites/52 tests); TypeScript passed; independent verification found no code findings.
  - Acceptance: all reads/writes enforce direct company scope and preserve the rule that company belongs to DailyReport, not Task.
  - Review workload: one honest split produced two independent commits (1,493 and 1,342 authored lines), both above target. User accepted the documented size exceptions.

- [x] **T04 — Reception and stock workflow hexagons**
  - Route: delegated direct; multi-file write trigger.
  - Status: complete. The user explicitly continued after reviewing the implementation, accepting the documented review-size exceptions.
  - Implement reception/items and stock, including R017 and R014/R015 boundaries.
  - Evidence: `d31b906` adds Reception/Stock, validated reception quantities, the additive migration, and generated Prisma output; `a174c29` adds atomic R017 DailyReport approval deduction.
  - Checks: strict-TDD RED/GREEN observed; focused tests passed (17 suites, 190 tests); TypeScript and Prisma validation passed; independent verification accepted both work units.
  - Acceptance: reception creation is pending-only; validated quantities change client-scoped stock; report approval atomically deducts client stock. Web-only validation remains explicitly pending its inbound web adapter because endpoints are out of scope.

- [x] **T05 — Photo hexagon and integration registration**
  - Route: delegated direct; multi-file write trigger.
  - Status: complete. Atomic album attachment correction independently verified.
  - Implemented Photo without artificial domain classes, with album-key scoping and module registration.
  - Evidence: `c04a8a4` adds Photo; `6f6dae2` makes the five-photo album limit atomic with serializable transaction/retry.
  - Checks: strict-TDD RED/GREEN observed; focused Jest passed (5 suites, 59 tests); TypeScript passed; independent verification accepted the correction.
  - Acceptance: module is composition-root wired, tested, and contains no empty ceremonial domain model. Tenant/company isolation is a documented schema gap because Photo is polymorphic with no relation or ownership field.
  - Review workload: ~876 authored lines. The Photo module is the smallest coherent behavior + test unit, so await user acceptance of a documented size exception.

## Progress
- 2026-09-25: Scope and constraints read from the Notion task via MCP. Baseline mapping confirms existing entity modules already use partial hexagonal patterns. Latest branch commit `657be13` establishes tenant-scoped company administration and is a compatibility constraint.
- 2026-09-25: User selected strict TDD and a feature-branch chain. T01 is active; all later slices remain blocked for review after their predecessor closes.
- 2026-09-25: Work-unit commit `97aaaf2` added Client/Input modules and `d9a20ed` corrected their atomic tenant-scoped updates. Strict-TDD RED/GREEN evidence was observed; focused tests (6 suites, 41 tests) and TypeScript passed twice, including independent verification after correction.
- 2026-09-25: T01 is complete and intentionally paused for human review. Native committed-range assessment was unavailable due unrelated untracked inventory; the native workspace inspection confirms its current candidate is unrelated local dirty files.
- 2026-09-25: User reviewed T01 and explicitly authorized T02. Recipe aggregate implementation is active.
- 2026-09-25: T02 implementation discovered that `Recipe` and `RecipeItem` have no spray-volume field. The uncommitted module validates dose and deterministic load order.
- 2026-09-25: User authorized expanding T02 with the Prisma field and migration needed to enforce the full R009 spray-volume rule.
- 2026-09-25: Prisma client generation modified four tracked outputs under `packages/backend/prisma/generated/**`; repository configuration confirms those outputs are versioned build inputs, so they belong with the schema change.
- 2026-09-25: User confirmed the Recipe table will be empty where the migration is applied. Required spray-volume columns therefore need no data backfill.
- 2026-09-25: Work-unit commit `050b681` completed T02. Strict-TDD RED/GREEN evidence was observed; focused tests (5 suites, 84 tests), TypeScript, and Prisma schema validation passed. Independent verification found no code findings.
- 2026-09-25: User reviewed T02 and explicitly authorized T03. DailyReport and MachineActivity implementation is active.
- 2026-09-25: T03 implementation completed with strict-TDD RED/GREEN and focused checks (10 suites, 105 tests; TypeScript passed). User selected one honest split: DailyReport was committed as `0a2365a`, MachineActivity as `a9c16a3`.
- 2026-09-25: Independent verification found no code findings in either work unit. Both commits remain above the review target (1,493 and 1,342 authored lines); the user accepted the two documented size exceptions.
- 2026-09-25: T03 is complete and intentionally paused for human review.
- 2026-09-25: User reviewed T03 and explicitly authorized T04. Reception and Stock workflow implementation is active.
- 2026-09-25: T04 implementation passed focused checks (17 suites, 165 tests; TypeScript passed) but found that `ReceptionItem` has only one quantity field. Web-only validation is an inbound-adapter enforcement gap, correctly left unimplemented because endpoints are out of scope.
- 2026-09-25: User authorized adding the validated reception-quantity Prisma field and migration needed for full R014/R015.
- 2026-09-25: Full T04 workflow passed strict-TDD and focused checks (17 suites, 190 tests; TypeScript and Prisma validation passed). User selected one honest split: Reception/Stock was committed as `d31b906`; DailyReport approval/R017 as `a174c29`.
- 2026-09-25: Independent verification accepted both work units. Both remain above the review target (3,115 and 1,002 authored lines); the user explicitly continued after review, accepting the documented size exceptions.
- 2026-09-25: T04 is complete. Photo implementation is active by user continuation.
- 2026-09-25: T05 implementation passed strict-TDD and focused checks (4 suites, 54 tests; TypeScript passed). Photo's only defensible scope is the `(entityType, entityId)` album key; tenant/company isolation is a schema relation gap. The user accepted the size exception and commit `c04a8a4` was created.
- 2026-09-25: Independent verification rejected T05 because the five-photo limit is a non-atomic count-then-create flow. T05 remains open until an atomic attach correction is implemented and independently verified.

## Next step
Correct the atomic five-photo limit, verify it, then close the feature and push only if verification passes.
