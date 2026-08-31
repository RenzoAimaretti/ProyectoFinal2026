# Tasks: Sprint 1 Tenant Scope Remaining Entities

## Batch 0: TaskType schema/migration planning

- [x] 0.1 RED: add schema/client expectation tests for `TaskType.companyId`, `Company.taskTypes`, and per-company uniqueness in `packages/backend/prisma/schema.prisma`; command: `pnpm --filter backend run test -- task-type`.
- [x] 0.2 GREEN: plan migration/backfill SQL before Prisma client generation: infer/duplicate `TaskType` rows per company, abort ambiguous `(companyId,name)`, then run Prisma generate so `packages/backend/prisma/generated` types include `companyId`.
- [x] 0.3 Verify `TaskType` schema tests and document migration notes in this artifact before applying production code.

### Batch 0 evidence

- `pnpm --filter backend run test -- task-type` → 3 suites / 19 tests passing.
- Migration/backfill note: before enforcing `@@unique([companyId, name])`, backfill must either duplicate catalog task types per company or infer `companyId` from existing `Task -> Lot -> Farm -> companyId` ancestry, and abort on ambiguous duplicate `(companyId, name)` pairs.

## Batch 1: TaskType tenant scope

- [x] 1.1 RED: extend `src/entities/task-type/**/*spec.ts` for 401, JWT-derived `companyId`, scoped list/read, 404 cross-tenant target, 409 duplicate per tenant.
- [x] 1.2 GREEN: update task-type controller/service/use-cases/ports/Prisma adapter to use `companyId` and preserve routes; command: `pnpm --filter backend run test -- task-type`.
- [x] 1.3 Verify scoped Prisma predicates in `src/entities/task-type/adapters/outbound/*.spec.ts`; update tasks evidence.

### Batch 1 evidence

- `pnpm --filter backend run test -- task-type` → 4 suites / 24 tests passing.
- TaskType controller now derives tenant from `req.user.firmaId`, protects every route with `JwtAuthGuard`, and strips client `companyId` from writes.
- TaskType use cases and Prisma adapter now scope list/read/duplicate checks by `companyId`; repository deletes/updates resolve the tenant-owned row first, then operate by id.
- Validation still keeps domain/application free of NestJS/Prisma imports.

## Batch 2: Livestock + Machine direct company scope

- [x] 2.1 RED: add direct-owner tests in `livestock.controller.spec.ts`, `livestock.use-cases.spec.ts`, `machine.controller.spec.ts`, `machine.use-cases.spec.ts`.
- [x] 2.2 GREEN: scope livestock/machine controllers, use-cases, ports, `prisma-*.repository.ts`, and owned lot validation; run `pnpm --filter backend run test -- livestock machine`.
- [x] 2.3 Verify body `companyId` is ignored and cross-tenant ids return 404/400; update tasks evidence.

### Batch 2 evidence

- `pnpm --filter backend run test -- livestock machine` → 8 suites / 60 tests passing.
- Livestock and machine controllers now derive tenant scope from `req.user.firmaId`, require `JwtAuthGuard`, and strip deprecated body `companyId` on secured writes.
- Livestock/machine use cases and Prisma adapters now use company-scoped read/update/delete predicates; livestock tag uniqueness is company-local, and lot validation is tenant-scoped.

## Batch 3: Task indirect scope

- [x] 3.1 RED: extend `task.controller.spec.ts` and `task.use-cases.spec.ts` for Lot/Farm scope plus TaskType/operator foreign relation rejection.
- [x] 3.2 GREEN: update task ports/readers/repository/use-cases including add/remove operator; run `pnpm --filter backend run test -- task`.
- [x] 3.3 Verify `Task -> Lot -> Farm.companyId` predicates and artifact evidence.

### Batch 3 evidence

- `pnpm --filter backend run test -- task` → 7 suites / 54 tests passing.
- Task controller now requires `JwtAuthGuard`, derives tenant from `req.user.firmaId`, and strips client `companyId` from task writes.
- Task use cases and Prisma adapter now scope list/read/update/delete and operator mutations through `Task -> Lot -> Farm.companyId`, while create validates lot and task type through company-aware readers.

## Batch 4: LivestockEvent + WeightRecord scope

- [x] 4.1 RED: add tests in `livestock-event.*.spec.ts` and `weight-record.*.spec.ts` for livestock/user tenant traversal.
- [x] 4.2 GREEN: scope event/weight controllers, readers, repositories, use-cases; run `pnpm --filter backend run test -- livestock-event weight-record`.
- [x] 4.3 Verify 400 for foreign livestock/operator relations and update evidence.

### Batch 4 evidence

- `pnpm --filter backend run test -- livestock-event weight-record` → 6 suites / 43 tests passing.
- LivestockEvent and WeightRecord controllers now derive tenant scope from `req.user.firmaId`, require `JwtAuthGuard`, and strip compatibility `companyId` from writes.
- LivestockEvent/WeightRecord use cases and Prisma adapters now scope list/read/update/delete by `livestock.companyId`; create/update validate livestock and operator through company-aware reader ports and return 400 for foreign relations.

## Batch 5: MachineUsage double-scope

- [x] 5.1 RED: add `machine-usage.*.spec.ts` cases requiring both owned Machine and owned Task.
- [x] 5.2 GREEN: update machine-usage readers/repository/use-cases/controller; run `pnpm --filter backend run test -- machine-usage`.
- [x] 5.3 Verify Machine + Task double-scope predicates; update evidence.

### Batch 5 evidence

- `pnpm --filter backend run test -- machine-usage` → 3 suites / 17 tests passing.
- MachineUsage controller now requires `JwtAuthGuard` and derives tenant scope from `req.user.firmaId`.
- MachineUsage use cases and Prisma adapters now scope list/read/update through both `machine.companyId` and `task -> lot -> farm.companyId`, and create validates machine/task/user through company-aware readers before checking assignment.

## Batch 6: LivestockMovement migration + scope

- [x] 6.1 RED: create `livestock-movement.controller.spec.ts` and use-case/adapter specs for JWT guard, livestock+lot validation, 404/400 outcomes.
- [x] 6.2 GREEN: migrate `src/entities/livestock-movement/**` to hexagonal ports/use-cases/adapters; only import module in `app.module.ts` after explicit activation acceptance.
- [x] 6.3 Verify `pnpm --filter backend run test -- livestock-movement` and record activation decision.

### Batch 6 evidence

- `pnpm --filter backend run test -- livestock-movement` → 3 suites / 15 tests passing.
- LivestockMovement controller now derives tenant scope from `req.user.firmaId`, protects every route with `JwtAuthGuard`, and strips compatibility `companyId` from create payloads.
- LivestockMovement use cases and Prisma adapters now scope list/read through both `livestock.companyId` and `lot -> farm.companyId`, and create validates livestock and lot ownership before insert.
- Activation decision: `LivestockMovementModule` remains defined but is still not imported in `app.module.ts`; no module activation was applied without explicit acceptance.

### Batch 6 TDD evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 6.1 | `packages/backend/src/entities/livestock-movement/livestock-movement.controller.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ Guards + delegation | ✅ Clean |
| 6.1 | `packages/backend/src/entities/livestock-movement/application/use-cases/livestock-movement.use-cases.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 2+ cases | ✅ Clean |
| 6.1 | `packages/backend/src/entities/livestock-movement/adapters/outbound/prisma-livestock-movement.repository.spec.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 2+ cases | ✅ Clean |

## Batch 7: User tenant scope

- [x] 7.1 RED: extend `user.controller.spec.ts` and `user.use-cases.spec.ts` for tenant-local list/read/update/create and 404 cross-tenant target.
- [x] 7.2 GREEN: scope user controller/service/use-cases/repository; defer bootstrap/admin-global policy behind explicit acceptance gate.
- [x] 7.3 Verify `pnpm --filter backend run test -- user` and update evidence.

### Batch 7 evidence

- `pnpm --filter backend run test -- user` → 2 suites / 21 tests passing.
- User controller now requires `JwtAuthGuard`, derives tenant scope from `req.user.firmaId`, and strips deprecated body `companyId` on create/update.
- User use cases and Prisma adapter now scope list/read/update by `companyId`; cross-tenant targets resolve through company-scoped lookup and return 404.

### Batch 7 TDD evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 7.1 | `packages/backend/src/entities/user/user.controller.spec.ts` | Unit | ✅ 19/19 | ✅ Written | ✅ Passed | ✅ 2 cases | ✅ Clean |
| 7.2 | `packages/backend/src/entities/user/application/use-cases/user.use-cases.spec.ts` | Unit | ✅ 19/19 | ✅ Written | ✅ Passed | ✅ 2+ cases | ✅ Clean |
| 7.3 | `packages/backend/src/entities/user/application/use-cases/user.use-cases.spec.ts` | Unit | ✅ 19/19 | ✅ Written | ✅ Passed | ✅ 2+ cases | ✅ Clean |

## Final verify/archive tasks

- [x] 8.1 Run full regression only: `pnpm --filter backend run test`; do not build or lint.
- [x] 8.2 Run SDD verify, update `verify-report.md`, then archive only after PASS/PASS_WITH_WARNINGS.
- [x] 8.3 Hotfix: fix `TaskModule` wiring so `RemoveTaskOperatorUseCase` receives `USER_READER`.

### Final verification evidence

- `pnpm --filter backend run test` → 34 suites / 263 tests passing.
- `pnpm --filter backend run test:cov -- task.module.spec.ts` → targeted coverage hotfix path passing.
- SDD verify status: PASS, with no critical findings, warnings, or suggestions.
- Archive completed under `openspec/changes/archive/2026-08-31-sprint1-tenant-scope-remaining-entities/`.
