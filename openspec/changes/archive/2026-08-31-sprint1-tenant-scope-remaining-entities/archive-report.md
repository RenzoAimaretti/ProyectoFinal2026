# Archive Report — Sprint 1 Tenant Scope Remaining Entities

## Archived Change

- `sprint1-tenant-scope-remaining-entities`

## Outcome

Sprint 1 tenant enforcement for the remaining operational entities is complete and archived. The spec now covers TaskType tenant ownership, direct-owned livestock/machine isolation, indirect-owned graph isolation, cross-tenant relation rejection, tenant-local users, and endpoint classification boundaries.

## Source of Truth Updated

- `openspec/specs/multi-tenant-enforcement/spec.md` updated by merging the delta requirements into the main spec.

## Verification Basis

- Final verify: `PASS`
- Critical issues: none
- Warnings: none
- Suggestions: none
- Full backend Jest: `pnpm --filter backend run test` passed
- Targeted coverage rerun after the TaskModule wiring fix passed: `pnpm --filter backend run test:cov -- task.module.spec.ts`

## Engram Traceability

- `#499` — exploration
- `#501` — proposal
- `#503` — spec
- `#505` — design
- `#507` — tasks
- `#511` — apply-progress
- `#526` — verify-report / PASS confirmation

## Archive Contents

- `proposal.md` ✅
- `specs/` ✅
- `design.md` ✅
- `tasks.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅
