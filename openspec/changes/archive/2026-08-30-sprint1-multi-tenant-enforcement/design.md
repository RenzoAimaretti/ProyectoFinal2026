# Design: Sprint 1 Multi-Tenant Enforcement

## Technical Approach

Implement the smallest tenant boundary in the existing NestJS hexagonal slices: farms first, lots next. Controllers stay as inbound adapters, guarded by `JwtAuthGuard`, read `req.user.firmaId`, and pass plain `companyId`/tenant-aware inputs into services/use cases. Use cases stay framework-free and call explicit repository ports. Prisma filtering lives only in outbound adapters.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Tenant source | Use JWT `req.user.firmaId` only | Accept body `companyId`; global Prisma middleware | Body tenant is unsafe; middleware is too broad for Sprint 1 and risks public/global endpoints. |
| Controller user access | Use `@Req()` now | Add `@CurrentUser()` decorator | Ponytail/minimal: only two controllers in scope; avoid abstraction until repetition hurts. |
| Compatibility | Ignore deprecated body `companyId` on farm writes | Reject with 400; keep trusting it | Spec requires Sprint 1 compatibility while preventing client-selected tenancy. |
| Cross-tenant errors | Target resource miss = 404; invalid relation body = 400 | 403 for all tenant violations | 404 hides another tenant’s target; 400 correctly signals an invalid `farmId` relation in input. |

## Data Flow

```text
Authorization Bearer JWT
  -> JwtAuthGuard/JwtStrategy validates { sub,email,role,firmaId }
  -> Farm/Lot controller reads req.user.firmaId
  -> Service forwards tenant-aware input
  -> Use case calls scoped port methods
  -> Prisma outbound adapter filters by companyId or farm.companyId
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/backend/src/entities/farm/farm.controller.ts` | Modify | Add `@UseGuards(JwtAuthGuard)`, `@Req()`, pass `req.user.firmaId`; overwrite/omit body `companyId`. |
| `packages/backend/src/entities/farm/farm.service.ts` | Modify | Change method signatures to accept tenant id and delegate to tenant-aware use cases; keep HTTP error mapping here. |
| `packages/backend/src/entities/farm/application/farm.types.ts` | Modify | Add tenant-aware input shapes if helpful; do not expose HTTP/Nest types. |
| `packages/backend/src/entities/farm/application/farm.ports.ts` | Modify | Replace unsafe reads with `findAllByCompanyId(companyId)`, `findByIdForCompany(id, companyId)`, `updateForCompany(id, companyId, data)`. Keep duplicate/company reader methods. |
| `packages/backend/src/entities/farm/application/use-cases/*.ts` | Modify | `findAll/find/update` accept `companyId`; create uses JWT-derived `companyId`; update ignores body `companyId`. |
| `packages/backend/src/entities/farm/adapters/outbound/prisma-farm.repository.ts` | Modify | Implement scoped `findMany/findFirst/update` filters; remove `companyId` mutation from update data. |
| `packages/backend/src/entities/farm/application/use-cases/farm.use-cases.spec.ts` | Modify | RED tests for scoped list/read/update and ignored body `companyId`. |
| `packages/backend/src/entities/farm/farm.controller.spec.ts` | Create | Verify guard metadata/delegation with `req.user.firmaId` and body `companyId` ignored. |
| `packages/backend/src/entities/lot/lot.controller.ts` | Modify | Add guard and `@Req()`, pass tenant id to all service calls. |
| `packages/backend/src/entities/lot/lot.service.ts` | Modify | Forward tenant id; map `InvalidRelationError` to 400 and `EntityNotFoundError` to 404. |
| `packages/backend/src/entities/lot/domain/errors.ts` | Modify | Add `InvalidRelationError` for cross-tenant `farmId` body relations. |
| `packages/backend/src/entities/lot/application/lot.ports.ts` | Modify | Add `findAllByCompanyId`, `findByIdForCompany`, `updateForCompany`; change `FarmReaderPort` to `findByIdForCompany(id, companyId)`. |
| `packages/backend/src/entities/lot/application/use-cases/*.ts` | Modify | Scope list/read/update by tenant; validate create/update `farmId` through `FarmReaderPort.findByIdForCompany`. |
| `packages/backend/src/entities/lot/adapters/outbound/prisma-lot.repository.ts` | Modify | Filter lots with relation `farm: { companyId }`; update uses scoped pre-check/where flow. |
| `packages/backend/src/entities/lot/adapters/outbound/prisma-farm.reader.ts` | Modify | Implement tenant-scoped farm existence check. |
| `packages/backend/src/entities/lot/application/use-cases/lot.use-cases.spec.ts` | Modify | RED tests for transitive ownership, 404 target, 400 invalid farm relation. |
| `packages/backend/src/entities/lot/lot.controller.spec.ts` | Create | Verify guard metadata/delegation with tenant id. |

## Interfaces / Contracts

```ts
findAllByCompanyId(companyId: string): Promise<Record[]>;
findByIdForCompany(id: string, companyId: string): Promise<Record | null>;
updateForCompany(id: string, companyId: string, data: UpdateInput): Promise<Record>;
FarmReaderPort.findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Use-case unit | Tenant id passed to scoped ports; ignored farm `companyId`; lot cross-tenant farm rejected | Extend existing Jest specs with fakes first. |
| Controller unit | Guard applied; `req.user.firmaId` mapped into service calls | Create farm/lot controller specs; inspect Nest metadata/delegation. |
| Adapter unit | Prisma query shape uses `companyId`/`farm.companyId` filters | Mock `PrismaService` methods if needed; no real DB. |
| E2E | 401 guard contract only if controller metadata tests are insufficient | Avoid unless necessary. |

## Migration / Rollout

No schema migration required. Roll out farms first, then lots. Keep auth/global endpoints untouched. Flutter clients must send bearer tokens; deprecated write-body `companyId` may remain during Sprint 1 but is non-authoritative.

## Risk Controls

- Add RED tests before implementation and run targeted Jest only; do not run build or mutating lint.
- Keep changes limited to farm/lot/auth guard reuse.
- Review queries for relation filters on lots; this is the highest bug risk.

## Non-Goals

- No Django migration.
- No generic Prisma tenant middleware.
- No `@CurrentUser()` decorator in Sprint 1.
- No tenancy changes for companies, modules, auth refresh/logout, livestock, tasks, machines, or users.
- No schema/index migration unless later performance evidence requires it.

## Open Questions

- None blocking.
