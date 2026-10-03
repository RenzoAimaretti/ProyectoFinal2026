# Exploration: sprint1-multi-tenant-enforcement

### Current State
- Backend is a NestJS/Prisma monorepo slice under `packages/backend`; `AppModule` imports `AuthModule` plus entity modules for companies, farms, lots, livestock, tasks, users, machines, etc. (`packages/backend/src/app.module.ts`).
- Auth already produces the right tenant source: `LoginUseCase` signs JWT payload with `sub`, `email`, `role`, `firmaId`, and returns `user.id/email/role/firmaId` (`packages/backend/src/auth/application/use-cases/login.use-case.ts`). `JwtStrategy.validate()` maps payload into `req.user = { id, email, role, firmaId }` (`packages/backend/src/auth/strategies/jwt.strategy.ts`).
- `JwtAuthGuard` and `RolesGuard` exist, but entity controllers do not use them. Search found no `@UseGuards`, `JwtAuthGuard`, `RolesGuard`, or `@Roles` in `packages/backend/src/entities/**/*.controller.ts`.
- Current tenant isolation is not enforced. Tenant-scoped repositories commonly call unfiltered `findMany()` and `findUnique({ where: { id } })`; examples: farms (`prisma-farm.repository.ts`), lots (`prisma-lot.repository.ts`), livestock, tasks, users, machines, events, records, and usages.
- `companyId` is currently trusted from request bodies in tenant-owned resources: `FarmController.create/update`, `UserController.create/update`, `MachineController.create/update`, `LivestockController.create/update`. This conflicts with the intended contract: effective tenant must come from `req.user.firmaId`.
- Prisma schema is shared database/shared schema already: `Company` owns `Farm`, `Livestock`, `Machine`, `User`; `Lot` is tenant-scoped through `Farm`; `Task`, `MachineUsage`, `LivestockEvent`, `WeightRecord`, and `LivestockMovement` are transitively tenant-scoped through lot/livestock/machine/operator relations (`packages/backend/prisma/schema.prisma`).

Endpoint classification:
- Public auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` currently public/body-token based. Login is guarded by `LocalAuthGuard`; refresh/logout use refresh token body.
- Tenant-scoped: `farms`, `lots`, `livestocks`, `livestock-events`, `livestock-movements`, `weight-records`, `tasks`, `machines`, `machine-usages`, and regular user management within a company. These need `JwtAuthGuard`, tenant context, and repository/use-case filtering.
- Administrative/global: `companies`, `modules`, `companies/add-module`, and cross-company user administration. These should be protected by `JwtAuthGuard` plus role policy before exposing globally; they should not become tenant-filtered CRUD by accident.

### Affected Areas
- `packages/backend/src/auth/strategies/jwt.strategy.ts` — source of `req.user.firmaId`; already suitable for tenant derivation.
- `packages/backend/src/auth/guards/jwt-auth.guard.ts` and `roles.guard.ts` — already available but not applied to entity controllers.
- `packages/backend/src/auth/decorators/` — only `roles.decorator.ts` exists; no `CurrentUser` decorator yet.
- `packages/backend/src/entities/farm/**` — best first slice: direct `companyId`, small route surface, already hexagonal-ish use cases/ports/repository.
- `packages/backend/src/entities/lot/**` — next slice: derives tenant via farm relation; needs farm-reader to expose `companyId` and repository methods filtered by farm/company.
- `packages/backend/prisma/schema.prisma` — confirms tenant shape and transitive ownership paths; likely needs indexes/unique constraints later, not during exploration.
- `docs/hexagonal-conventions.md` — source of truth: strangler migration, preserve route contracts, controllers are inbound adapters, Prisma only in outbound adapters or `src/prisma`.

### Approaches
1. **Derive tenant in controller and pass plain tenant input to service/use case** — Controller reads `req.user.firmaId`, ignores/removes body `companyId`, and calls service/use case with `{ tenantId, ...body }`.
   - Pros: Keeps HTTP concerns at inbound adapter; makes tenant source explicit; fast for vertical slice; fits current service facade pattern.
   - Cons: Requires updating each controller method; temporary duplication until a decorator/helper exists.
   - Effort: Low

2. **Derive tenant inside service/use case** — Service/use case receives request/user or resolves context internally.
   - Pros: Less controller mapping code.
   - Cons: Violates local hexagonal rule that use cases must not read HTTP request/user objects; couples application core to transport/auth context.
   - Effort: Medium, but wrong boundary

3. **Explicit repository filters per tenant-scoped port** — Add methods like `findAllByCompanyId(companyId)`, `findByIdForCompany(id, companyId)`, `updateForCompany(id, companyId, data)`, and transitive variants for lots/tasks.
   - Pros: Clear, testable, per-slice migration; no hidden magic; aligns with ports/adapters; 404 semantics are natural when scoped query returns null.
   - Cons: More method signatures; every slice must be touched deliberately.
   - Effort: Medium

4. **Generic Prisma middleware/extension for tenancy** — Inject company filter automatically for all Prisma queries.
   - Pros: Centralized safety net if perfectly implemented.
   - Cons: High risk with Prisma 7/client output, nested relations, raw queries, transitive tenant paths (`Lot` via `Farm`, `Task` via `Lot`), background/admin operations, and request context propagation. Easy to create false confidence.
   - Effort: High

5. **Return 404 for cross-tenant resources** — Scope reads/updates/deletes by tenant and translate null/not found to 404.
   - Pros: Does not reveal whether another tenant's ID exists; simple with filtered repositories.
   - Cons: Less explicit for debugging/admin clients.
   - Effort: Low

6. **Return 403 for cross-tenant resources after global lookup** — Fetch resource by ID, compare tenant, then deny.
   - Pros: Explicit authorization semantics.
   - Cons: Leaks resource existence and requires extra reads; more footguns unless admin use cases are separate.
   - Effort: Medium

7. **Add `CurrentUser` decorator now** — Create an inbound adapter decorator returning the JWT principal.
   - Pros: Removes `@Req() any` repetition; gives controllers typed access to `firmaId`; good foundation if multiple endpoints are migrated.
   - Cons: One more artifact to maintain; not strictly required for the first tiny change.
   - Effort: Low

8. **Use `@Req()` now, decorator later** — Pass `req.user.firmaId` manually in the first slice.
   - Pros: Smallest first step; proves behavior before introducing helper conventions.
   - Cons: Repeats untyped `any`; easy to drift across controllers.
   - Effort: Low

### Recommendation
Proceed to proposal/design for a small vertical slice starting with `farms`, then `lots`. Even though `docs/hexagonal-conventions.md` recommends `livestock` as the first backend pilot for a broader hexagonal migration, multi-tenant enforcement should start at `farms` because it is the direct root of land tenancy: it has direct `companyId`, only `GET /`, `GET /:id`, `POST /`, `PUT /:id`, and lots depend on it transitively.

Implementation direction: protect farm routes with `JwtAuthGuard`; derive tenant in the controller from JWT (`req.user.firmaId`, preferably through a small `CurrentUser` decorator if the change touches more than one controller); remove/ignore body-driven `companyId`; pass tenant as plain application input; use explicit repository filters rather than generic Prisma middleware; return 404 for resources outside the tenant scope.

### Risks
- Existing entity controllers are effectively public; applying guards may break clients that do not yet send `Authorization: Bearer` tokens.
- Body-driven `companyId` appears in several tenant-owned resources, so a farms-only slice reduces risk but does not finish tenant enforcement.
- Transitive tenant resources (`lots`, `tasks`, `events`, `records`, `movements`, `machine-usages`) need careful relation-aware filters; generic `companyId` filtering will not work uniformly.
- `companies`/`modules` are global/admin surfaces and need role policy decisions; do not accidentally hide them under the caller tenant.
- Current tests likely assert body `companyId` behavior; specs must explicitly update expected contract.
- Prisma schema lacks obvious tenant-friendly indexes/compound uniqueness for several lookups; performance/integrity work may be needed after behavior is secured.

### Ready for Proposal
Yes. The next phase should create a focused proposal for `farms` as the first enforcement slice, with `lots` as the immediate follow-up and global/admin endpoints explicitly out of scope except for classification.
