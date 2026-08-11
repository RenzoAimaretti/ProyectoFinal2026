# Hexagonal2 Domain Migration — Session Summary

## Goal

Continue the backend migration to local hexagonal architecture using `docs/hexagonal-conventions.md`, the `agrolify-hexagonal-architecture` skill, and ponytail constraints.

## Completed In This Batch

Migrated these backend slices:

- `packages/backend/src/entities/livestock-event/**`
- `packages/backend/src/entities/weight-record/**`
- `packages/backend/src/entities/user/**`
- `packages/backend/src/auth/**`

Each migrated slice now follows the local structure:

```text
domain/
application/
  use-cases/
  ports/types/validation
adapters/
  outbound/
*.service.ts   # thin Nest facade
*.module.ts    # composition root
*.controller.ts
```

## Key Decisions

- Kept `LivestockEventService` and `WeightRecordService` as thin Nest facades to preserve controller contracts and reduce churn.
- Used plain application types instead of domain classes where there was no meaningful domain behavior.
- Added direct controller specs instead of heavier e2e tests for inbound route-contract coverage.
- Migrated `user` to local hexagonal architecture with thin Nest facade, application use cases, outbound Prisma adapters, and controller/use-case specs.
- Did not run build.
- Did not run lint because backend lint uses `--fix` and mutates unrelated files.

## Verification

Final backend test run:

```text
pnpm --filter backend run test
PASS — 23 suites, 233 tests
```

Task batch verification:

- `task-type` and `task` controller delegation specs exist and pass.
- `task-type` and `task` use-case specs cover success plus main failure paths.
- `application/**` and `domain/**` stay free of forbidden NestJS/Prisma imports.
- Prisma access remains confined to outbound adapters.

Boundary checks:

- `livestock-event/application/**`: no real NestJS/Prisma imports.
- `livestock-event/domain/**`: no real NestJS/Prisma imports.
- `weight-record/application/**`: no real NestJS/Prisma imports.
- `weight-record/domain/**`: no real NestJS/Prisma imports.
- `user/application/**`: no real NestJS/Prisma imports.
- `user/domain/**`: no real NestJS/Prisma imports.
- Prisma access remains in outbound adapters.

## Gotchas

- Verifier subagents can overwrite the same Engram `apply-progress` topic if instructed poorly. The apply-progress artifact was restored manually after being overwritten by an "artifact missing" note.
- `weight-record.findOne` intentionally preserves legacy behavior by returning `null` when no record is found.
- `user.create` still falls back to `username` as `email` when `email` is omitted, matching the legacy service behavior.

## Next Recommended Batch

1. `auth` completed

Completed in prior batches:

- `task-type`
- `task`
- `machine`
- `machine-usage`
- `user`

## Batch Update — Auth Slice

Migrated the backend `auth` slice to local hexagonal architecture.

Notes:

- Split auth behavior into application use cases, application ports/types, outbound adapters, and a thin Nest facade service.
- Kept the existing public routes, login flow, refresh rotation, logout behavior, and 423 lockout semantics.
- Moved password hashing, token signing, refresh token generation, and clock access behind ports/adapters.
- Preserved bcrypt fallback handling inside the password hasher adapter so legacy hashes still validate and migrate.
- Verified with `pnpm --filter backend run test` (`23 suites, 233 tests`).

## Batch Update — Machine Slices

Migrated these backend slices in the current batch:

- `packages/backend/src/entities/machine/**`
- `packages/backend/src/entities/machine-usage/**`

Notes:

- Kept the legacy `intialFuel` request field on the machine-usage create route, but mapped it to Prisma's `initialFuel` field in the outbound adapter.
- Preserved existing routes and controller delegation while moving Prisma access into outbound adapters.
- Verified with `pnpm --filter backend run test` (`20 suites, 210 tests`).
- Restored explicit strict-TDD evidence for the machine batch in Engram apply-progress so `machine` and `machine-usage` are traceable alongside the earlier `task-type` and `task` batch.

## Batch Update — Task Slices

Migrated these backend slices in the current batch:

- `packages/backend/src/entities/task-type/**`
- `packages/backend/src/entities/task/**`

Notes:

- Preserved `task-type.findOne` null-on-miss behavior.
- Moved Prisma access into outbound adapters and kept controllers thin.
- Added strict-TDD coverage for use cases and controller delegation.
- Verified with `pnpm --filter backend run test -- src/entities/task-type/application/use-cases/task-type.use-cases.spec.ts src/entities/task/application/use-cases/task.use-cases.spec.ts src/entities/task-type/task-type.controller.spec.ts src/entities/task/task.controller.spec.ts`.
