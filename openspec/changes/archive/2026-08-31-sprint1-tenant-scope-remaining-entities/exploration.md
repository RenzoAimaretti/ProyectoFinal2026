# Exploration: sprint1-tenant-scope-remaining-entities

### Current State
- `sprint1-multi-tenant-enforcement` is already completed and archived under `openspec/changes/archive/2026-08-30-sprint1-multi-tenant-enforcement/`; its archive report says farm and lot routes derive tenant from `req.user.firmaId`, ignore deprecated body `companyId` for farm writes, and enforce agreed 404/400 cross-tenant behavior.
- Main spec `openspec/specs/multi-tenant-enforcement/spec.md` currently covers only protected farm/lot tenant context plus endpoint classification boundaries.
- `Farm` and `Lot` are the implemented reference pattern: controllers use `JwtAuthGuard`, read `req.user.firmaId`, services/use cases accept plain `companyId`, ports expose scoped methods such as `findAllByCompanyId`, `findByIdForCompany`, and `updateForCompany`, and Prisma filtering lives in outbound adapters.
- Remaining operational controllers are still public and unscoped: `livestocks`, `livestock-events`, `livestock-movements`, `weight-records`, `tasks`, `task-types`, `machines`, `machine-usages`, and `users` do not apply `JwtAuthGuard` today.
- Remaining repositories still use unfiltered `findMany()`, `findUnique({ where: { id } })`, `update({ where: { id } })`, or `delete({ where: { id } })` patterns. This means IDs from other tenants are visible/modifiable unless each module is deliberately scoped.
- `openspec/config.yaml` is absent in this checkout, so OpenSpec retrieval used the existing `openspec/specs/` and archive contents directly.

### Tenant Ownership Classification and Relation Paths
- Direct `companyId` ownership:
  - `Livestock.companyId` plus optional `lotId`: list/read/update/delete must scope by `livestock.companyId`; create must derive `companyId` from JWT and validate optional `lotId -> farm.companyId` equals tenant.
  - `Machine.companyId`: list/read/create/update must scope by machine company; create/update must ignore or forbid client tenant reassignment, following the farm pattern.
  - `User.companyId`: ordinary tenant user management should list/read/create/update inside `req.user.firmaId`, but cross-company/admin user management is not safe to assume without role policy.
- Indirect ownership through `Farm`/`Lot`:
  - `Lot -> Farm.companyId` is already completed.
  - `Task.lotId -> Lot.farm.companyId`: task list/read/create/update/delete and operator assignment/removal must scope through the task lot. `CreateTaskUseCase` currently validates only lot existence, not tenant ownership.
  - `LivestockMovement.lotId -> Lot.farm.companyId` and `livestockId -> Livestock.companyId`: movement create must require both sides belong to the tenant; reads must hide records if either path is outside tenant. This module exists but is not imported by `AppModule`, so activation status is an open question.
- Indirect ownership through `Livestock`:
  - `LivestockEvent.livestockId -> Livestock.companyId`: list/read/create/update must scope by livestock company; optional `operatorId -> User.companyId` must match tenant when present.
  - `WeightRecord.livestockId -> Livestock.companyId`: list/read/create/update/delete must scope by livestock company; optional `operatorId -> User.companyId` must match tenant when present.
- Indirect ownership through `Machine` and `Task`:
  - `MachineUsage.machineId -> Machine.companyId` and `taskId -> Task.lot.farm.companyId`: create/update must require both machine and task belong to tenant; if an operator validation is involved, `operatorId -> User.companyId` must also match tenant. Reads must scope by both relation paths or at least the joined tenant path.
- Task type tenant scope chosen by user: option 2, make `TaskType` tenant-scoped by `Company`.
  - Current schema has global `TaskType { id, name, description, tasks[] }` with no `companyId`.
  - Required schema direction: add `companyId String`, `company Company @relation(fields: [companyId], references: [id])`, add `taskTypes TaskType[]` to `Company`, and replace global name uniqueness behavior with company-scoped uniqueness, ideally `@@unique([companyId, name])` if duplicate names per company should be blocked.
  - `Task.taskTypeId -> TaskType.companyId` must match `Task.lot.farm.companyId` during create and any future task type reassignment. `PrismaTaskTypeReader` currently checks only global existence.
  - Migration/data backfill is non-trivial because existing task types lack owners. Need a backfill strategy before applying schema changes.
- Global/admin entities not safe for blind tenant filtering:
  - `Company`, `Module`, `Company.modules`, and `/companies/add-module` are platform/admin surfaces. They need explicit auth/role policy, not caller-tenant filtering.
  - `auth/login`, `auth/refresh`, and `auth/logout` are auth surfaces and should remain out of tenant filtering.
  - `TaskType` is currently global but is intended to become tenant-owned; until the schema migration exists, blind route-level tenant filtering is impossible.

### Affected Areas
- `packages/backend/prisma/schema.prisma` — source tenant graph; needs `TaskType.companyId` and `Company.taskTypes` if option 2 proceeds, plus likely indexes/unique constraints for tenant joins.
- `packages/backend/src/entities/farm/**` and `packages/backend/src/entities/lot/**` — completed reference implementation for guard placement, controller tenant extraction, scoped ports, and outbound Prisma filters.
- `packages/backend/src/entities/livestock/**` — direct company ownership with optional lot validation; currently trusts input `companyId` and uses unscoped repository methods.
- `packages/backend/src/entities/machine/**` — direct company ownership; currently trusts input `companyId` and uses unscoped repository methods.
- `packages/backend/src/entities/user/**` — direct company ownership; currently body-driven create and global list/read; needs tenant/user-admin policy before broad changes.
- `packages/backend/src/entities/task-type/**` — schema and behavior pivot from global catalog to company-owned catalog; affects duplicate-name checks, list/read/update/delete, task association validation, and task readers.
- `packages/backend/src/entities/task/**` — indirect ownership via lot and task type; operator add/remove must validate both task tenant and operator tenant/role.
- `packages/backend/src/entities/livestock-event/**` — indirect ownership via livestock and optional operator user.
- `packages/backend/src/entities/weight-record/**` — indirect ownership via livestock and optional operator user.
- `packages/backend/src/entities/machine-usage/**` — indirect ownership via both machine and task; existing readers select no tenant information.
- `packages/backend/src/entities/livestock-movement/**` — indirect ownership via livestock and lot, but module is not imported by `AppModule` today.
- `openspec/specs/multi-tenant-enforcement/spec.md` — main spec must be extended in later phases for the remaining entities.

### Approaches
1. **Continue explicit per-module scoped ports/adapters** — Extend each use case signature with `companyId`, add relation-aware read ports, and filter in Prisma outbound adapters.
   - Pros: Matches archived farm/lot pattern and Agrolify hexagonal rules; easy to test with TDD; avoids hidden Prisma middleware footguns.
   - Cons: More signatures and tests per module; must deliberately design relation paths.
   - Effort: Medium.

2. **Generic Prisma tenant middleware/extension** — Try to inject tenant filtering globally.
   - Pros: Centralized-looking enforcement.
   - Cons: Unsafe for global/admin endpoints, TaskType migration, nested relation paths, and multi-path entities like MachineUsage; violates the need to classify each route deliberately.
   - Effort: High and risky.

3. **Schema-first TaskType tenant migration, then operational modules** — Add company ownership to TaskType before task scoping.
   - Pros: Prevents task enforcement from accepting global task types from other tenants; aligns with chosen option 2.
   - Cons: Requires backfill decision and migration care before behavior tests can fully pass.
   - Effort: Medium/High.

### Recommendation
Use the same explicit tenant-context pattern already archived for farm/lot: controllers remain inbound adapters, apply `JwtAuthGuard`, read `req.user.firmaId`, and pass plain `companyId` to services/use cases; application/domain stay free of HTTP, Prisma, and concrete adapters; outbound Prisma adapters implement scoped relation-aware queries. Do not tenant-filter `companies`, `modules`, or auth endpoints as part of this change.

Recommended batch order:
1. **Schema foundation: TaskType by Company** — Decide backfill/default ownership, add `TaskType.companyId`, `Company.taskTypes`, and `@@unique([companyId, name])`; update task-type ports/use cases/repos to list/read/create/update/delete by tenant.
2. **Direct ownership modules** — `machine`, `livestock`, then tenant-scoped regular `user` management. They can copy farm-style direct `companyId` filters; livestock also validates optional lot tenant.
3. **Task module** — Scope by `Task -> Lot -> Farm.companyId`, validate `TaskType.companyId`, and validate operator user company/role for add/remove.
4. **Livestock dependent modules** — `livestock-event` and `weight-record`, validating livestock and optional operator user are in tenant.
5. **Cross-resource usage/movement modules** — `machine-usage` needs both machine and task tenant match; `livestock-movement` needs livestock and lot tenant match and should first confirm whether it must be imported into `AppModule`.
6. **Admin/global policy follow-up** — Separately decide roles for `companies`, `modules`, `/companies/add-module`, and cross-company user administration.

### Risks and Open Questions
- Existing clients may rely on unauthenticated operational endpoints; applying guards will change runtime behavior to 401 without bearer tokens.
- TaskType backfill is the biggest schema risk: existing global task types need a company assignment strategy, duplication strategy, or a transitional migration.
- `User.email` and `User.username` are globally unique today; tenant-scoped user management may still be constrained globally unless product explicitly wants per-company uniqueness.
- `Livestock.tagNumber` is globally unique today; tenant isolation may expose whether this should become `@@unique([companyId, tagNumber])` in a future schema change.
- `LivestockMovementModule` is not imported by `AppModule`; clarify whether it is part of active Sprint 1 API before spending migration effort.
- `TaskType.update(taskIds)` can associate tasks across tenants unless task reads are tenant-scoped; consider whether this API should exist after TaskType becomes company-owned.
- Global/admin role semantics are undefined. Do not invent them inside tenant-scope work; spec/design should preserve routes but mark admin policy as separate.

### Ready for Proposal
Yes. The next phase should create a focused proposal for extending the archived farm/lot pattern to remaining operational entities, with TaskType-by-Company schema work first because the user chose option 2 and task scoping depends on it.
