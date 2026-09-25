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

- [ ] **T02 — Recipe aggregate hexagon**
  - Route: delegated direct; multi-file write trigger.
  - Model R009 only where behavior belongs: dose, spray volume, and loading order.
  - Acceptance: aggregate/item persistence stays outbound; use cases and tests protect the agronomic invariants.

- [ ] **T03 — Company-scoped operational hexagons**
  - Route: delegated direct; multi-file write trigger.
  - Implement `DailyReport`/items and `MachineActivity` with company scoping and the correct Task relationship.
  - Acceptance: all reads/writes enforce company scope and preserve existing contracts.

- [ ] **T04 — Reception and stock workflow hexagons**
  - Route: delegated direct; multi-file write trigger.
  - Implement reception/items and stock, including R017 and R014/R015 boundaries.
  - Acceptance: only web validation approves receptions; approval changes client-scoped stock correctly; mobile pending state remains allowed.

- [ ] **T05 — Photo hexagon and integration registration**
  - Route: delegated direct; multi-file write trigger.
  - Implement Photo without artificial domain classes and finish module registration/integration coverage required by the slice.
  - Acceptance: module is composition-root wired, tested, and contains no empty ceremonial domain model.

## Progress
- 2026-09-25: Scope and constraints read from the Notion task via MCP. Baseline mapping confirms existing entity modules already use partial hexagonal patterns. Latest branch commit `657be13` establishes tenant-scoped company administration and is a compatibility constraint.
- 2026-09-25: User selected strict TDD and a feature-branch chain. T01 is active; all later slices remain blocked for review after their predecessor closes.
- 2026-09-25: Work-unit commit `97aaaf2` added Client/Input modules and `d9a20ed` corrected their atomic tenant-scoped updates. Strict-TDD RED/GREEN evidence was observed; focused tests (6 suites, 41 tests) and TypeScript passed twice, including independent verification after correction.
- 2026-09-25: T01 is complete and intentionally paused for human review. Native committed-range assessment was unavailable due unrelated untracked inventory; the native workspace inspection confirms its current candidate is unrelated local dirty files.

## Next step
Wait for the user's review of T01. Do not begin T02 until the user explicitly continues.
