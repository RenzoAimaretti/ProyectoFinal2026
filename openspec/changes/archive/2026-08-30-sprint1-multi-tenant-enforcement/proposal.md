# Proposal: Sprint 1 Multi-Tenant Enforcement

## Intent

Implement real tenant isolation for Sprint 1. Today tenant-owned endpoints are effectively public and trust `companyId` from request bodies or unfiltered Prisma queries. The effective tenant MUST come from JWT `req.user.firmaId`.

## Scope

### In Scope
- Enforce shared database/shared schema tenancy using `companyId` as tenant key.
- Protect tenant-scoped endpoints with `JwtAuthGuard`.
- First vertical slice: `farms`; immediate follow-up: `lots`.
- Return 404 for scoped resource misses/cross-tenant IDs where useful.
- Strict TDD: failing tests before behavior changes.

### Out of Scope
- Django migration; keep NestJS/Prisma/PostgreSQL.
- Generic Prisma middleware/extension tenancy.
- Full migration of livestock/tasks/machines/users/events/usages.
- `@CurrentUser()` decorator unless repetition becomes painful.
- Admin/global authorization policy for `companies` and `modules` beyond classification.

## Capabilities

### New Capabilities
- `multi-tenant-enforcement`: Tenant-scoped APIs require JWT identity, derive tenant from `firmaId`, and prevent cross-tenant reads/writes.

### Modified Capabilities
- None: no existing OpenSpec specs are present to modify.

## Endpoint Categories and Initial Targets

- Public auth: keep `POST /auth/login`, `/auth/refresh`, `/auth/logout` public/body-token based for now.
- Tenant-scoped: start with `farms` (`GET /`, `GET /:id`, `POST /`, `PUT /:id`), then `lots` (`GET /`, `GET /:id`, `POST /`, `PUT /:id`).
- Admin/global: `companies`, `modules`, `companies/add-module`; do not tenant-filter accidentally.

## Approach

Controllers remain inbound adapters: apply `JwtAuthGuard`, read `req.user.firmaId`, ignore/remove body `companyId`, and pass plain tenant-aware input to services/use cases. Application/domain code must not import Nest request objects, HTTP exceptions, Prisma/generated types, or concrete adapters. Outbound repositories implement explicit scoped methods/filters (`findByIdForCompany`, `findAllByCompanyId`, transitive lot filters through farm/company). Prisma stays in outbound adapters or `src/prisma`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/backend/src/entities/farm/**` | Modified | First guarded tenant slice. |
| `packages/backend/src/entities/lot/**` | Modified | Follow-up transitive tenant slice. |
| `packages/backend/src/auth/**` | Reused | JWT guard/strategy provide `firmaId`. |
| `docs/hexagonal-conventions.md` | Reference | Boundary rules. |

## Testing Strategy

- RED: controller/use-case/repository tests proving no token is rejected, JWT tenant overrides body `companyId`, cross-tenant ID returns 404, and list queries only return tenant data.
- GREEN: implement smallest farm slice, then lot slice.
- REFACTOR: remove duplication only after tests pass.

## Migration / Rollout

Roll out behind route-level changes per slice: farms first, then lots. Update API clients to send bearer tokens before enabling wider tenant scopes. Existing data model already supports shared-schema tenancy.

## Risks and Open Questions

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Clients lack bearer tokens | Med | Coordinate farm endpoints first. |
| Transitive filters for lots are wrong | Med | Test through farm/company relation. |
| Admin endpoints leak globally | Med | Keep separate from tenant slice. |
| Missing tenant indexes hurt later | Low | Defer perf indexes after behavior. |

Open question: Should create/update DTOs remove `companyId` now or tolerate and ignore it for backward compatibility?

## Rollback Plan

Revert guarded/scoped farm and lot changes and restore previous repository methods. No schema migration is required for this proposal.

## Acceptance Criteria

- [ ] Farm routes require valid JWT and use `req.user.firmaId` as tenant.
- [ ] Farm list/read/create/update cannot access or write another tenant's data.
- [ ] Lot routes repeat the same guarantee through farm ownership.
- [ ] Cross-tenant resource access returns 404 where scoped lookup hides existence.
- [ ] Tests are written first and prove the tenant boundary.
