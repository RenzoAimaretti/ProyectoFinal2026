# Archive Report — Sprint 1 Multi-Tenant Enforcement

## Archived Change

- `sprint1-multi-tenant-enforcement`

## Outcome

Sprint 1 tenant enforcement is complete and archived. Farm and lot routes now derive tenant identity from `req.user.firmaId`, deprecated body `companyId` is non-authoritative on farm writes, and cross-tenant violations use the agreed 404/400 behavior.

## Source of Truth Updated

- `openspec/specs/multi-tenant-enforcement/spec.md` created from the delta spec because no main spec previously existed.

## Verification Basis

- Final verify: `PASS_WITH_WARNINGS`
- Targeted farm/lot tests: 4 suites, 42 tests
- Full backend Jest: 25 suites, 238 tests
- Targeted coverage rerun after the TS2420 fix passed
- Remaining warning: route-level tenant behavior is proven indirectly through unit/controller tests only; optional e2e route tests remain a follow-up

## Engram Traceability

- `#469` — exploration
- `#471` — proposal
- `#473` — spec
- `#476` — design
- `#479` — tasks
- `#481` — apply-progress and TS2420 fix evidence
- `#484` — verify-report and final PASS_WITH_WARNINGS verdict

## Archive Contents

- `proposal.md` ✅
- `specs/` ✅
- `design.md` ✅
- `tasks.md` ✅
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `exploration.md` ✅
- `state.yaml` ✅
