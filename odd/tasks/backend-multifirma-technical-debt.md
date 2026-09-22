# ODD — backend-multifirma-technical-debt

> Organic Driven Development feature document.
> Engram mirror: `odd/backend-multifirma-technical-debt/tasks`

## Objective

Resolve the actionable backend technical debt discovered after the multi-firma schema migration, while recording product and team decisions that change public behavior.

## Problem

The multi-firma migration left several boundary inconsistencies: user application use cases hash passwords directly, tenant-scoped repository APIs use company terminology, generated Prisma output has conflicting Git hygiene, and the multi-tenant OpenSpec does not reflect the implemented Tenant/Company split. A newly created user also cannot log in until a firma membership is provisioned.

## Scope

### Authorized implementation

- Password-hasher port migration for user create/update use cases.
- Tenant/firma naming correction in ports, adapters, and tests where the actual query scope is tenant.
- Evidence-based generated Prisma client ignore/tracking cleanup.
- Multi-tenant specification reconciliation and documentation of the login default-firma limitation.
- Characterization coverage needed for the above behavior.

### Pending explicit product/team decisions

- New-user membership provisioning contract and authoritative role source.
- Legacy `GET /` e2e contract: restore a root/health endpoint or remove/replace the stale test.
- Authentication and tenant scope for company read/update/module endpoints.

## Constraints

- Preserve the existing `Tenant` (tenant) and `Company` (firma) model.
- Do not silently alter public API behavior while decisions are pending.
- Do not change unrelated workspace modifications: `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, `.gitignore`, and `openspec/config.yaml` are pre-existing worktree changes.
- Strict TDD is active; use observed RED, GREEN, and REFACTOR evidence for implementation tasks.
- No push, PR creation, or merge without a separate explicit request.

## Authorized scope

`packages/backend/src/**`, `packages/backend/test/**`, `packages/backend/prisma/**`, `.gitignore`, `openspec/specs/multi-tenant-enforcement/**`, and this feature document. No mobile changes.

## Route per task

| Task | Route | Trigger evidence |
| --- | --- | --- |
| T01 | delegated | Password port migration affects multiple non-trivial application, adapter, composition, and test files. |
| T02 | delegated | Tenant terminology rename spans multiple ports, adapters, callers, and tests. |
| T03 | delegated | Generated client policy needs Git evidence plus coordinated ignore or tracking changes. |
| T04 | delegated | Specification reconciliation requires backend context and OpenSpec update. |
| T05 | delegated | Explicit-firma user provisioning spans API contract, use case, persistence, composition, and tests. |
| D02–D03 | blocked | Product/team decisions must be explicit before public behavior changes. |

## Checklist

- [x] **T01** Characterize and migrate user password hashing behind `PasswordHasherPort`; remove direct Argon2 imports from user application use cases.
- [x] **T02** Rename only tenant-scoped misleading port APIs and parameters from company terminology to tenant terminology; preserve firma-scoped APIs.
- [x] **T03** Resolve the generated Prisma client Git policy using verified tracking evidence.
- [x] **T04** Reconcile the multi-tenant OpenSpec with the implemented Tenant/Company model and document the default-firma-at-login limitation.
- [x] **T05** Add explicit-firma user provisioning: require `companyId`, validate tenant ownership, create `UserCompany`, and make `UserCompany.role` authoritative for firma-scoped authorization.
- [x] **D01** New-user provisioning: `POST /users` receives an explicit `companyId`; it creates a membership only after confirming that company belongs to the caller's tenant. `UserCompany.role` is authoritative.
- [x] **D02** Root endpoint/e2e contract: `GET /` is not a public backend contract; remove or replace the stale e2e with a current contract.
- [ ] **D03** Decide company administration authentication and tenant scope.

## Acceptance criteria

1. User application code depends on a password-hasher port, not Argon2 directly.
2. Tenant-scoped APIs cannot be mistaken for firma/company-scoped APIs by name.
3. Prisma generated output has one documented, reproducible Git policy.
4. OpenSpec matches the Tenant/Company and JWT `tenantId`/`firmaId` implementation.
5. Deferred API behavior remains unchanged until its decision is explicit.

## Applicable checks

- `pnpm --filter backend test`
- `pnpm --filter backend test:e2e` when tests do not depend on an undecided root-route contract
- `pnpm --filter backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter backend exec prisma validate`
- `pnpm --filter backend exec prisma generate`
- Git evidence: `git ls-files packages/backend/prisma/generated` and `git check-ignore -v packages/backend/prisma/generated/client.ts`

## Progress

- 2026-09-22 — Created after read-only exploration of the Notion item. Current branch: `feat/multifirma-schema`.
- 2026-09-22 — Confirmed generated Prisma files are tracked; `.gitignore` is an uncommitted pre-existing change and requires policy resolution before modification.
- 2026-09-22 — Blocked before source changes on D01–D03.
- 2026-09-22 — D01 provisioning input decided by the user: explicit target firma (`companyId`). Role authority is still a separate decision.
- 2026-09-22 — D01 completed by the user: explicit target firma (`companyId`) and role per firma (`UserCompany.role`) are the contract for provisioning and firma-scoped authorization.
- 2026-09-22 — T05 completed. `POST /users` now requires `companyId`, validates it against the authenticated tenant through `CompanyReaderPort`, and atomically creates the user plus its `UserCompany` membership. Authentication and refresh-token adapters derive the firma role from the active membership rather than `User.role`.
  - Changed files: `packages/backend/src/entities/user/{application,user.module.ts,adapters/outbound}`; `packages/backend/src/auth/{application,use-cases,adapters/outbound}`; `packages/backend/test/auth.e2e-spec.ts`; and focused unit tests.
  - RED: `pnpm --filter backend test -- --runInBand src/entities/user/application/use-cases/user.use-cases.spec.ts src/auth/adapters/outbound/prisma-user-credentials.repository.spec.ts src/entities/user/user.controller.spec.ts` failed because the company-reader port, `companyId`, and membership role were absent.
  - GREEN: the same focused command passed (3 suites, 22 tests).
  - REFACTOR: removed legacy `User.role` from the auth adapter mapping inputs; the same focused command passed again (3 suites, 22 tests).
  - Verification: `pnpm --filter backend test` passed (36 suites, 268 tests); `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` passed; `pnpm --filter backend test:e2e -- auth.e2e-spec.ts` passed (1 suite, 5 tests), scoped to exclude the known pre-existing root-route failure in `test/app.e2e-spec.ts`.
  - Commit identity: `feat(backend): provision users with firma memberships`.
- 2026-09-22 — D02 decided by the user: `GET /` is not a public backend contract; remove or replace the stale e2e with a current contract.
- 2026-09-22 — D02 applied by removing `packages/backend/test/app.e2e-spec.ts`, the stale `GET /` e2e that expected `Hello World!` from a non-existent root controller.
  - Verification: `pnpm --filter backend test:e2e` passed (1 suite, 5 tests: `test/auth.e2e-spec.ts`).
  - Readback: `packages/backend/test/app.e2e-spec.ts` is absent; Git reports it as deleted.
- 2026-09-22 — T01 completed. User create/update use cases now depend on a `PasswordHasherPort` owned by the user hexagon (`packages/backend/src/entities/user/application/user.ports.ts`, token `USER_PASSWORD_HASHER`); `UserModule` wires a user-owned outbound adapter. Direct `argon2` imports are gone from user application code.
  - Changed files: `packages/backend/src/entities/user/application/user.ports.ts`; `.../use-cases/create-user.use-case.ts`; `.../use-cases/update-user.use-case.ts`; `.../use-cases/user.use-cases.spec.ts`; `packages/backend/src/entities/user/user.module.ts`.
  - RED: `pnpm --filter backend test -- --runInBand src/entities/user/application/use-cases/user.use-cases.spec.ts` failed: `user.ports` had no `PasswordHasherPort`, and `CreateUserUseCase`/`UpdateUserUseCase` constructor arity rejected the injected port.
  - GREEN: the same focused command passed (1 suite, 19 tests).
  - REFACTOR: `pnpm --filter backend test -- --runInBand src/entities/user/application/use-cases/user.use-cases.spec.ts src/entities/user/user.controller.spec.ts` passed (2 suites, 21 tests); `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` passed.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.
- 2026-09-22 — T01 follow-up after independent verification: removed the cross-hexagon concrete adapter coupling. `UserModule` no longer imports `AuthPasswordHasher` from `src/auth`; a user-owned outbound adapter `UserPasswordHasher` (`packages/backend/src/entities/user/adapters/outbound/user-password-hasher.ts`) implements the user `PasswordHasherPort` and is bound to `PASSWORD_HASHER`. Public hashing behavior is unchanged (still Argon2, so existing hashes stay verifiable).
  - Changed files: `packages/backend/src/entities/user/adapters/outbound/user-password-hasher.ts` (new); `packages/backend/src/entities/user/user.module.ts`; `packages/backend/src/entities/user/application/use-cases/user.use-cases.spec.ts` (added a boundary assertion that the user module binds the user-owned adapter and imports no `auth/` module).
  - Boundary assertion preserved: `argon2` remains absent from user application/domain source; the spec still asserts this over application/domain files only and does not assert the outbound adapter cannot import crypto.
  - Verification: `pnpm --filter backend test -- --runInBand src/entities/user/application/use-cases/user.use-cases.spec.ts src/entities/user/user.controller.spec.ts` passed (2 suites, 22 tests); `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` passed.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.
- 2026-09-22 — T02 completed (delegated worker). Renamed tenant-scoped port/reader APIs and parameters from company to tenant terminology in `farm`, `lot`, `task`, `task-type`, and `user`; public HTTP contracts and runtime behavior are unchanged.
  - Renamed APIs: `findAllByTenantId`, `findByIdForTenant`, `findByIdWithOperatorsForTenant`, `findByNameAndTenantId`, `findByIdsForTenant`, `updateForTenant`, `addOperatorForTenant`, `removeOperatorForTenant`, `deleteForTenant` across ports, Prisma adapters, readers, and callers.
  - Preserved firma-scoped APIs: `user` `CompanyReaderPort`/`PrismaCompanyReader.findByIdForTenant` (real `companyId` + tenant ownership), `CreateUserInput.companyId`/`UpdateUserInput.companyId`, and `UserCompany` membership fields.
  - Preserved non-company scoped lookups: `findByNameAndClientId` (farm), `findByNameAndFarmId` (lot).
  - Preserved behavior-bearing strings: error messages still read "for company"/"does not belong to company", and `CreateTaskTypeUseCase` keeps the `'companyId'` validation label.
  - RED: not applicable — pure rename refactor with no behavior change; baseline characterization ran green before edits.
  - GREEN: `pnpm --filter backend test -- --runInBand src/entities/farm src/entities/lot src/entities/task src/entities/task-type src/entities/user` passed (14 suites, 121 tests) before and after the rename.
  - Verification: `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` passed.
  - Readback: no `ByCompanyId`/`ForCompany` symbols remain in the five modules; remaining `companyId`/`company` references are firma-scoped inputs, behavior-bearing strings, test fixtures, and out-of-scope `*.service.ts` inbound adapters.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.
- 2026-09-22 — T02 follow-up (delegated worker). Included the remaining tenant-scoped inbound service parameters: renamed `companyId` to `tenantId` in the `lot`, `task`, and `task-type` service method parameters and their positional call arguments to the tenant-scoped use cases. Public HTTP contracts and runtime behavior are unchanged (parameter names are positional, not part of any DTO or route).
  - Changed files: `packages/backend/src/entities/lot/lot.service.ts`; `packages/backend/src/entities/task/task.service.ts`; `packages/backend/src/entities/task-type/task-type.service.ts`.
  - Preserved firma/company-scoped names: `company` `companyId` (firma is the company entity), and the out-of-scope `*.service.ts` inbound adapters for `livestock`, `machine`, `machine-usage`, `livestock-event`, `livestock-movement`, `weight-record`, and `company`.
  - Preserved public contracts: no controller request handling, route params, body fields, error-message strings, or DTO fields were touched; spec `companyId` fields are request-body fixtures the controllers ignore.
  - RED: not applicable — pure rename of positional parameters with no behavior change.
  - GREEN: `pnpm --filter backend test -- --runInBand src/entities/lot src/entities/task src/entities/task-type` passed (10 suites, 77 tests).
  - Verification: `pnpm --filter backend exec tsc --noEmit -p tsconfig.json` passed.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.
- 2026-09-22 — T03 completed (delegated worker). Verified the generated Prisma output is tracked and removed the conflicting ignore rule, keeping one documented policy: `packages/backend/prisma/generated/**` is tracked source-of-record and is intentionally not ignored.
  - Verified tracking evidence: `git ls-files packages/backend/prisma/generated | wc -l` reported `35` tracked generated files; `git check-ignore -v packages/backend/prisma/generated/client.ts` reported no match (exit 1). `packages/backend/prisma/schema.prisma` still uses `generator client { provider = "prisma-client"; output = "./generated" }`.
  - Change: removed only the `packages/backend/prisma/generated/` line from `.gitignore`. The pre-existing `.atl/` entry and its `# Local Pi runtime state` comment were preserved; the file's existing CRLF lines were left untouched. No generated Prisma file was untracked or deleted.
  - Readback after the change: `git ls-files packages/backend/prisma/generated | wc -l` → `35`; `git check-ignore -v packages/backend/prisma/generated/client.ts` → no match; `git diff -- .gitignore` shows only the `# Local Pi runtime state` / `.atl/` addition.
  - Reproducibility: `pnpm --filter backend exec prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`; `pnpm --filter backend exec prisma generate` → `Generated Prisma Client (7.8.0) to .\prisma\generated in 411ms`, with `git status --porcelain --untracked-files=all packages/backend/prisma/generated` returning empty, so regeneration is deterministic against the tracked output.
  - RED: not applicable — configuration/Git-policy change with no runtime behavior to characterize.
  - GREEN: not applicable — validation is the readback and Prisma commands above.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.

- 2026-09-22 — T04 completed. Reconciled `openspec/specs/multi-tenant-enforcement/spec.md` with the implemented Tenant/Company split. The spec now documents `tenantId` (subscribed customer) for tenant-owned resources (farm, lot, task, task-type, user) and `firmaId` (firma/razón social, equals `companyId`) for firma-owned resources (livestock, machine, machine-usage, livestock-event, weight-record, livestock-movement). Removed obsolete "`companyId` is the tenant key" and "effective tenant MUST be `req.user.firmaId`" statements; TaskType uniqueness reworded to per-tenant (`@@unique([tenantId, name])`); Task moved to a tenant-scoped requirement. Added requirements/scenarios for explicit `companyId` provisioning plus `UserCompany.role` authority, and for the default-first-active-membership login/refresh limitation (earliest `createdAt` active `UserCompany`; no active membership fails without a token; no user-selected firma at login yet).
  - Changed files: `openspec/specs/multi-tenant-enforcement/spec.md`.
  - Evidence sources (read-only): `packages/backend/src/auth/application/auth.types.ts`; `packages/backend/src/auth/adapters/outbound/prisma-user-credentials.repository.ts`; `.../prisma-refresh-token.repository.ts`; `.../application/use-cases/{login,validate-user-credentials,refresh-tokens}.use-case.ts`; `packages/backend/src/entities/{farm,lot,task,task-type,user,machine,machine-usage,livestock,livestock-event,livestock-movement,weight-record}/*.controller.ts`; `packages/backend/src/entities/user/application/use-cases/create-user.use-case.ts`; `packages/backend/prisma/schema.prisma`.
  - RED: justified exception — documentation/spec-only change with no runtime behavior to characterize.
  - GREEN: not applicable — validation is the readback greps below.
  - Readback: `grep -n "companyId\` is the tenant key"` → no match; `grep -n "effective tenant MUST be"` → no match; the spec contains both `tenantId` and `firmaId`, the default first-active-membership limitation, and the explicit `companyId` provisioning contract.
  - Commit identity: `this commit: refactor(backend): resolve multifirma technical debt`.

## Next step

T04 is reconciled. Remaining open items are D03 (company administration authentication and tenant scope) and the pending product/team decisions.
