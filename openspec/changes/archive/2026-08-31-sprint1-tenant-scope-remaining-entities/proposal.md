# Proposal: Sprint 1 Tenant Scope Remaining Entities

## Intent

Extend the archived farm/lot tenant-enforcement pattern to remaining operational backend entities so authenticated users only access data belonging to `req.user.firmaId`. Avoid Prisma middleware shortcuts; keep tenant rules explicit at use-case ports/adapters.

## Scope

### In Scope
- Protect operational endpoints: `livestocks`, `livestock-events`, `livestock-movements`, `weight-records`, `tasks`, `task-types`, `machines`, `machine-usages`, and tenant-local `users`.
- Add `TaskType.companyId`, `Company.taskTypes`, and `@@unique([companyId, name])`; task type reads/writes become tenant-scoped.
- Validate tenant relation paths: direct `companyId`, `Task -> Lot -> Farm`, `LivestockEvent/WeightRecord -> Livestock`, `MachineUsage -> Machine + Task`, `LivestockMovement -> Livestock + Lot`.
- Preserve current HTTP route paths while adding `JwtAuthGuard` and JWT-derived tenant context.

### Out of Scope
- New admin/role policy for `companies`, `modules`, `/companies/add-module`, or cross-company user administration.
- Changing auth endpoints: `login`, `refresh`, `logout`.
- Broad uniqueness redesign for `User.email`, `User.username`, or `Livestock.tagNumber`.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `multi-tenant-enforcement`: Extend requirements beyond farms/lots to all Sprint 1 operational entities, including tenant-owned task types.

## Approach

Endpoint classification:
- **Tenant operational**: guarded and scoped entities listed in scope.
- **Auth public/session**: unchanged auth endpoints.
- **Platform/admin-global**: companies/modules unchanged pending role design.

Phased batches:
1. **Schema foundation**: migrate/backfill `TaskType.companyId`; update task-type ports/adapters/use cases.
2. **Direct-owned**: machines, livestock, tenant-local users.
3. **Task graph**: tasks and operator assignment/removal with lot, task type, and user validation.
4. **Livestock dependents**: livestock events and weight records.
5. **Cross-resource**: machine usages and livestock movements; confirm movement module activation.

Migration/backfill: dev/MVP-safe migration only. If existing task types are seed/catalog rows, duplicate them for each existing company before making `companyId` required; otherwise assign rows to the owning company inferred from existing tasks. Fail migration loudly on ambiguous duplicates before adding `@@unique([companyId, name])`.

Test strategy: strict TDD with failing tests first. For each batch, add controller/use-case/repository tests for 401 unauthenticated, scoped lists, 404 cross-tenant targets, 400 cross-tenant relations, and JWT-derived `companyId`. Primary command: `pnpm --filter backend run test`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/backend/prisma/schema.prisma` | Modified | TaskType tenant relation and uniqueness. |
| `packages/backend/src/entities/*` | Modified | Guards, scoped ports/use cases, Prisma adapter filters. |
| `openspec/specs/multi-tenant-enforcement/spec.md` | Modified | Delta requirements for remaining entities. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Operational clients lack JWT | Med | Document 401 behavior; update clients separately. |
| TaskType backfill ambiguity | Med | Dev/MVP migration with explicit preflight failure. |
| Undefined admin roles | High | Keep admin/global endpoints out of scope. |

## Rollback Plan

Revert code and schema migration before shared data is promoted. If already migrated in dev, drop `TaskType.companyId` relation/unique index and restore global task-type behavior from seeds/backups.

## Dependencies

- Archived farm/lot implementation as reference.
- Exploration artifact `sdd/sprint1-tenant-scope-remaining-entities/explore`.

## Success Criteria

- [ ] All in-scope operational routes require JWT and derive tenant from `req.user.firmaId`.
- [ ] Cross-tenant reads/updates/deletes return 404; invalid cross-tenant relations return 400.
- [ ] TaskType is company-owned and cannot be reused across tenants.
- [ ] `pnpm --filter backend run test` passes.
