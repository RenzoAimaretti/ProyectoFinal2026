# Tasks — Hexagonal2 Domain Migration

## Completed

- [x] Migrate `livestock-event` to local hexagonal architecture.
- [x] Add `livestock-event` use-case tests with fake ports.
- [x] Add `livestock-event` controller contract tests.
- [x] Keep `livestock-event` Prisma access inside outbound adapters.
- [x] Verify `livestock-event/application/**` and `domain/**` have no forbidden NestJS/Prisma imports.
- [x] Migrate `weight-record` to local hexagonal architecture.
- [x] Add `weight-record` use-case tests with fake ports.
- [x] Add `weight-record` controller contract tests.
- [x] Keep `weight-record` Prisma access inside outbound adapters.
- [x] Verify `weight-record/application/**` and `domain/**` have no forbidden NestJS/Prisma imports.
- [x] Migrate `machine`.
- [x] Migrate `machine-usage`.
- [x] Run backend unit suite: `pnpm --filter backend run test`.

## Pending

- [x] Migrate `task-type`.
- [x] Migrate `task`.
- [x] Migrate `user`.
- [x] Migrate `auth` after CRUD slices are stable.

## Explicit Non-Goals For This Batch

- [ ] Do not run build.
- [ ] Do not run backend lint while it uses `--fix`.
- [ ] Do not create domain classes without behavior.
- [ ] Do not migrate unrelated modules in the same batch.
