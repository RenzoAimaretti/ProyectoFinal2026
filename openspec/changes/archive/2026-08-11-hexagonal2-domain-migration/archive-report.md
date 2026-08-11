# Archive Report — Hexagonal2 Domain Migration

## Archived Change

- `livestock-event`
- `weight-record`
- `task-type`
- `task`
- `machine`
- `machine-usage`
- `user`
- `auth`

## Outcome

The cumulative `hexagonal2-domain-migration` change is complete and ready for archive. No pending migration slices remain in `tasks.md`; the only unchecked items are the intentional non-goals to avoid build/lint during archive.

## Verification Basis

- Final backend suite: `pnpm --filter backend run test` → `PASS — 23 suites, 233 tests`
- Earlier verified batches preserved in history:
  - `task-type` / `task` → `PASS — 16 suites, 179 tests`
  - `machine` / `machine-usage` → `PASS — 20 suites, 210 tests`
  - `user` → `PASS — 22 suites, 229 tests`
  - `auth` → `PASS — 23 suites, 233 tests`
- Boundary checks stayed clean across migrated `application/**` and `domain/**` slices.
- Prisma access remained confined to outbound adapters.

## Engram Traceability

- `#293` — strict-TDD evidence merged into cumulative batch state
- `#295` — cumulative verification report for the change
- `#297` — historical task-type/task milestone

## OpenSpec Status

- Main archive move completed
- Active change is archived
- Archive preserves `state.yaml`, `summary.md`, `verify-report.md`, `verification.md`, `tasks.md`, and this report as the audit trail
