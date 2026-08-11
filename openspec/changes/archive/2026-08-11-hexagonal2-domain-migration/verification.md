# Verification — Hexagonal2 Domain Migration

## Commands Run

```text
pnpm --filter backend run test
```

## Result

```text
PASS — 23 suites, 233 tests
```

## Boundary Checks

Verified for:

- `packages/backend/src/entities/livestock-event/application/**`
- `packages/backend/src/entities/livestock-event/domain/**`
- `packages/backend/src/entities/weight-record/application/**`
- `packages/backend/src/entities/weight-record/domain/**`
- `packages/backend/src/entities/user/application/**`
- `packages/backend/src/entities/user/domain/**`
- `packages/backend/src/auth/application/**`
- `packages/backend/src/auth/domain/**`

Expected result:

- No `@nestjs/*` imports in application/domain.
- No `PrismaService` imports in application/domain.
- No generated Prisma model/enum imports in application/domain.
- No concrete adapter imports in application/domain.

Observed result:

- Boundary clean.
- Only string literals in specs reference forbidden tokens to assert import bans.

## Inbound Contract Coverage

- `livestock-event.controller.spec.ts`
  - covers `findAll`
  - covers `findOne`
  - covers `create`
  - covers `update`

- `weight-record.controller.spec.ts`
  - covers `findAll`
  - covers `findOne`
  - covers `create`
  - covers `update`
  - covers `remove`

- `user.controller.spec.ts`
  - covers `findAll`
  - covers `findOne`
  - covers `create`
  - covers `update`

- `auth.controller.spec.ts`
  - covers `login`
  - covers `refresh`
  - covers `logout`

- `auth.service.spec.ts`
  - covers thin facade delegation
  - covers lockout translation
  - covers invalid refresh input translation

- `auth/application/use-cases/auth.use-cases.spec.ts`
  - covers validate/login/refresh/logout success paths
  - covers lockout, invalid input, and inactive/failed-login paths

## Warnings

- Build was intentionally not run.
- Lint was intentionally not run because the backend lint script uses `--fix`.
- `weight-record.findOne` preserves legacy `null` behavior for missing records.
- Auth keeps bcrypt fallback inside the password hasher adapter and preserves 423 lockout payloads.

## Historical Verification — task-type / task

- Full backend suite: `pnpm --filter backend run test`
- Result: `PASS — 16 suites, 179 tests`
- `task-type` and `task` controller delegation specs passed.
- `task-type` and `task` use-case specs passed.
- `application/**` and `domain/**` for both slices remain free of forbidden NestJS/Prisma imports.
- Prisma access remains confined to outbound adapters.
