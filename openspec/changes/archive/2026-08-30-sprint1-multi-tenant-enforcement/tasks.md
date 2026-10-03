# Tasks: Sprint 1 Multi-Tenant Enforcement

## Phase 1: Farm RED Tests

- [x] 1.1 Update `packages/backend/src/entities/farm/application/use-cases/farm.use-cases.spec.ts`: `findAll/execute(companyId)` calls `findAllByCompanyId`, `find/execute(id, companyId)` calls `findByIdForCompany`, missing scoped farm throws `EntityNotFoundError`.
- [x] 1.2 Update same farm use-case spec: create derives `companyId` from tenant input, update calls `updateForCompany(id, companyId, data)` and ignores deprecated body `companyId`.
- [x] 1.3 Create `packages/backend/src/entities/farm/farm.controller.spec.ts`: assert `JwtAuthGuard` metadata and controller methods pass `req.user.firmaId` to service while ignoring write-body `companyId`.
- [x] 1.4 Run RED: `pnpm --dir packages/backend test -- farm.use-cases.spec.ts farm.controller.spec.ts` and confirm failures are only tenant-contract failures.

## Phase 2: Farm GREEN Implementation

- [x] 2.1 Modify `farm.controller.ts`, `farm.service.ts`, and `application/farm.types.ts` so list/read/create/update receive tenant id from `req.user.firmaId`; keep Nest HTTP errors in service/controller only.
- [x] 2.2 Modify `application/farm.ports.ts` and `application/use-cases/*.ts` to use `findAllByCompanyId`, `findByIdForCompany`, and `updateForCompany`; preserve duplicate/company reader behavior.
- [x] 2.3 Modify `adapters/outbound/prisma-farm.repository.ts` to scope `findMany/findFirst/update` by `companyId` and strip `companyId` from update data.
- [x] 2.4 Run GREEN farm target: `pnpm --dir packages/backend test -- farm.use-cases.spec.ts farm.controller.spec.ts`; mark Phase 1-2 tasks `[x]` in this file as they pass.

## Phase 3: Lot RED Tests

- [x] 3.1 Update `packages/backend/src/entities/lot/application/use-cases/lot.use-cases.spec.ts`: list/read/update use tenant-scoped lot ports; cross-tenant target maps to `EntityNotFoundError`.
- [x] 3.2 Update same lot spec: create/update validate `farmId` via `FarmReaderPort.findByIdForCompany(id, companyId)` and throw `InvalidRelationError` for cross-tenant farm relations.
- [x] 3.3 Create `packages/backend/src/entities/lot/lot.controller.spec.ts`: assert `JwtAuthGuard` metadata and `req.user.firmaId` delegation for list/read/create/update.
- [x] 3.4 Run RED: `pnpm --dir packages/backend test -- lot.use-cases.spec.ts lot.controller.spec.ts` and confirm failures match tenant isolation only.

## Phase 4: Lot GREEN Implementation

- [x] 4.1 Modify `lot.controller.ts`, `lot.service.ts`, and `domain/errors.ts` to pass tenant id and map `InvalidRelationError` to 400, `EntityNotFoundError` to 404.
- [x] 4.2 Modify `application/lot.ports.ts` and `application/use-cases/*.ts` for `findAllByCompanyId`, `findByIdForCompany`, `updateForCompany`, and tenant-scoped farm relation validation.
- [x] 4.3 Modify `adapters/outbound/prisma-lot.repository.ts` and `prisma-farm.reader.ts` to filter lots through `farm.companyId` and scoped farm existence.
- [x] 4.4 Run GREEN lot target: `pnpm --dir packages/backend test -- lot.use-cases.spec.ts lot.controller.spec.ts`; mark Phase 3-4 tasks `[x]` as they pass.

## Phase 5: Boundary Verification / Apply Progress

- [x] 5.1 Run boundary targets only: `pnpm --dir packages/backend test -- farm.use-cases.spec.ts lot.use-cases.spec.ts farm.controller.spec.ts lot.controller.spec.ts`; do not run build or backend lint.
- [x] 5.2 Review untouched boundary files: confirm `companies`, `modules`, `auth/login`, `auth/refresh`, and `auth/logout` were not changed for tenant filtering.
- [x] 5.3 During sdd-apply, update this `tasks.md` after each passing RED/GREEN step; leave any failing item unchecked with the failing command noted.
