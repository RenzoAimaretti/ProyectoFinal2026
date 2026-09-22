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

- [ ] **T01** Characterize and migrate user password hashing behind `PasswordHasherPort`; remove direct Argon2 imports from user application use cases.
- [ ] **T02** Rename only tenant-scoped misleading port APIs and parameters from company terminology to tenant terminology; preserve firma-scoped APIs.
- [ ] **T03** Resolve the generated Prisma client Git policy using verified tracking evidence.
- [ ] **T04** Reconcile the multi-tenant OpenSpec with the implemented Tenant/Company model and document the default-firma-at-login limitation.
- [x] **T05** Add explicit-firma user provisioning: require `companyId`, validate tenant ownership, create `UserCompany`, and make `UserCompany.role` authoritative for firma-scoped authorization.
- [x] **D01** New-user provisioning: `POST /users` receives an explicit `companyId`; it creates a membership only after confirming that company belongs to the caller's tenant. `UserCompany.role` is authoritative.
- [ ] **D02** Decide the root endpoint/e2e contract.
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

## Next step

Resolve D02, the root endpoint/e2e contract.
