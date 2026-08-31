# Design: Sprint 1 Tenant Scope Remaining Entities

## Technical Approach

Extend the existing farm/lot tenant flow: controllers keep the same routes, add `JwtAuthGuard`, read `req.user.firmaId`, pass `companyId` into services/use cases, and make outbound Prisma adapters enforce tenant predicates. Application/domain keep plain errors and ports; Prisma remains in `adapters/outbound` or `src/prisma`.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Tenant source | Use JWT `firmaId` only | Accept `companyId` from body/query | Farm/lot already prove this pattern and it prevents client-side tenant spoofing. |
| TaskType ownership | Add `TaskType.companyId`, `Company.taskTypes`, `@@unique([companyId, name])`, indexes on `companyId` and `[companyId, name]` | Keep global catalog | User chose schema change; tenant-local names avoid cross-company coupling. |
| Relation validation | Add `*ReaderPort.findByIdForCompany` variants | Fetch relation then compare in controller | Keeps HTTP out of use cases and makes 400 invalid relation vs 404 target decisions explicit. |
| Movement module | Design as tenant-scoped hexagon if activated | Drop route | Route files exist but `AppModule` does not import it; implementation should confirm activation before changing app imports. |

## Data Flow

```text
HTTP route -> JwtAuthGuard -> Controller(req.user.firmaId)
  -> Service(error mapping) -> UseCase(companyId, input)
      -> Reader ports validate owned relations
      -> Repository port uses Prisma tenant filters
```

## Prisma / Migration

Modify `packages/backend/prisma/schema.prisma`:
- `Company`: add `taskTypes TaskType[]`.
- `TaskType`: add `companyId String`, `company Company @relation(fields: [companyId], references: [id])`, `@@unique([companyId, name])`, `@@index([companyId])`.
- Add/confirm traversal indexes: `Farm.companyId`, `Lot.farmId`, `Livestock.companyId`, `Task.lotId`, `Machine.companyId`, `MachineUsage.taskId/machineId`, event/weight `livestockId/operatorId`.
- Backfill first: duplicate seed/catalog task types per company or infer company from existing tasks through `Task -> Lot -> Farm -> companyId`; abort on ambiguous duplicate `(companyId,name)` before adding the unique constraint.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/backend/prisma/schema.prisma` | Modify | TaskType tenant relation, unique/indexes. |
| `packages/backend/src/entities/{task-type,task,machine,livestock,user,livestock-event,weight-record,machine-usage}/**` | Modify | Guards, tenant args, scoped ports/use cases/repos. |
| `packages/backend/src/entities/livestock-movement/**` | Modify/Create | If activated, replace Prisma-in-service with hexagonal ports/use cases and tenant checks. |
| `*.spec.ts` beside affected modules | Modify | Add RED tests before implementation. |

## Interfaces / Contracts

Repository ports become scoped: `findAllByCompanyId(companyId)`, `findByIdForCompany(id, companyId)`, `updateForCompany(id, companyId, data)`, `deleteForCompany` where applicable. Reader ports needed:
- Task: `LotReader.findByIdForCompany`, `TaskTypeReader.findByIdForCompany`, `UserReader.findByIdForCompany` for operators.
- Livestock: `LotReader.findByIdForCompany`; repository filters direct `Livestock.companyId`.
- Events/weights: `LivestockReader.findByIdForCompany`, `UserReader.findByIdForCompany`; repositories filter via `livestock.companyId`.
- Machines: direct `companyId`; MachineUsage validates both `Machine.companyId` and `Task -> Lot -> Farm.companyId`.
- Users: tenant-local list/read/update use `companyId`; create ignores body `companyId` and uses JWT tenant.
- Movement: validate `Livestock.companyId` and destination `Lot -> Farm.companyId`.

## Error Mapping Strategy

Use existing service mapping: `EntityNotFoundError -> 404` for cross-tenant target reads/updates/deletes; `InvalidRelationError`/`InvalidInputError -> 400` for owned target with foreign relation outside tenant; `DuplicateEntityError -> 409`; guard handles unauthenticated `401`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Use case | Success, cross-tenant relation rejection, duplicate task type per company | Fake ports; write failing tests first. |
| Repository | Prisma predicates include tenant traversal paths | Mock Prisma calls as existing specs do; assert `where` filters. |
| Controller/service | Guarded routes, JWT-derived tenant, HTTP error mapping | Extend controller specs; body `companyId` ignored. |
| Full backend | Regression suite | `pnpm --filter backend run test` only; no build/lint. |

## Batch Implementation Plan

1. TaskType schema/backfill + task-type hex updates.
2. Direct-owned modules: machine, livestock, user.
3. Task graph: task CRUD and operator add/remove depend on lot/task-type/user readers.
4. Livestock dependents: livestock-event, weight-record depend on scoped livestock/user readers.
5. Cross-resource: machine-usage; livestock-movement only after activation decision.

## Migration / Rollout

Dev/MVP rollout: run backfill migration before deploying code requiring `TaskType.companyId`. Rollback by reverting migration/code and restoring global task-type seed behavior from backup if data has not been promoted.

Compatibility: preserve route paths and payload shapes except body `companyId` is ignored for tenant-scoped writes. Auth public flows, Company/Module endpoints, `/companies/add-module`, and admin-global authorization policy are explicit non-goals.

## Open Questions

- [ ] Is `LivestockMovementModule` intentionally inactive in `AppModule`, or should this change import it?
