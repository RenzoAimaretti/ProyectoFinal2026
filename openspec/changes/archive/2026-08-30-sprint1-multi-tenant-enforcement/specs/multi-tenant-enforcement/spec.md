# Multi-Tenant Enforcement Specification

## Purpose

Protect Sprint 1 tenant-owned APIs in the shared PostgreSQL schema. `companyId` is the tenant key, and the effective tenant MUST be `req.user.firmaId` from the authenticated JWT.

## Requirements

### Requirement: Protected Tenant Context

Farm and lot endpoints in this slice MUST require a bearer JWT. The backend MUST derive tenant identity from the token and MUST NOT treat client-supplied `companyId` as authoritative. Flutter clients SHOULD send `Authorization: Bearer <accessToken>` and SHOULD NOT send authoritative tenant identity for protected writes. Client-supplied `companyId` on tenant-scoped writes is deprecated; during Sprint 1 compatibility it MUST be ignored in favor of `req.user.firmaId`, not rejected.

#### Scenario: Farms block unauthenticated access
- GIVEN no valid bearer token is provided
- WHEN the client calls any in-scope `/farms` endpoint
- THEN the response MUST be 401

#### Scenario: Lots block unauthenticated access
- GIVEN no valid bearer token is provided
- WHEN the client calls any in-scope `/lots` endpoint
- THEN the response MUST be 401

### Requirement: Farm Tenant Isolation

Farm list, read, create, and update operations MUST be scoped to the authenticated user's `firmaId`. Cross-tenant farm reads/updates MUST return 404 to avoid revealing existence.

#### Scenario: Farm list returns only current tenant farms
- GIVEN tenant A and tenant B both have farms
- WHEN tenant A calls `GET /farms`
- THEN every returned farm MUST have `companyId = tenantA.firmaId`
- AND no tenant B farm MUST be returned

#### Scenario: Farm read hides another tenant farm
- GIVEN a farm exists for tenant B
- WHEN tenant A calls `GET /farms/:id` with tenant B's farm id
- THEN the response MUST be 404

#### Scenario: Farm create derives tenant from JWT
- GIVEN tenant A is authenticated
- WHEN tenant A calls `POST /farms` with body `companyId` set to tenant B
- THEN the created farm MUST belong to tenant A
- AND the body `companyId` MUST be ignored as deprecated/non-authoritative without creating tenant B data

#### Scenario: Farm update cannot cross tenant boundary
- GIVEN a farm exists for tenant A
- WHEN tenant A calls `PUT /farms/:id` with body `companyId` set to tenant B
- THEN the farm MUST remain assigned to tenant A

#### Scenario: Farm update hides another tenant target
- GIVEN a farm exists for tenant B
- WHEN tenant A calls `PUT /farms/:id` with tenant B's farm id
- THEN the response MUST be 404

### Requirement: Lot Tenant Isolation Through Farm Ownership

Lot list, read, create, and update operations MUST be scoped through the lot's farm ownership. Cross-tenant lot lookup/update targets MUST return 404; invalid cross-tenant farm relations in request bodies MUST return 400.

#### Scenario: Lot list returns only lots under current tenant farms
- GIVEN tenants A and B each have farms and lots
- WHEN tenant A calls `GET /lots`
- THEN every returned lot MUST belong to a farm whose `companyId = tenantA.firmaId`

#### Scenario: Lot read hides another tenant lot
- GIVEN a lot exists under tenant B's farm
- WHEN tenant A calls `GET /lots/:id` with that lot id
- THEN the response MUST be 404

#### Scenario: Lot create rejects another tenant farm
- GIVEN tenant A is authenticated and `farmId` belongs to tenant B
- WHEN tenant A calls `POST /lots` with that `farmId`
- THEN the response MUST be 400
- AND no lot MUST be created

#### Scenario: Lot update rejects moving to another tenant farm
- GIVEN a lot exists under tenant A's farm and another farm belongs to tenant B
- WHEN tenant A calls `PUT /lots/:id` with tenant B's `farmId`
- THEN the response MUST be 400
- AND the lot MUST remain under tenant A's farm

#### Scenario: Lot update hides another tenant target lot
- GIVEN a lot exists under tenant B's farm
- WHEN tenant A calls `PUT /lots/:id` with tenant B's lot id
- THEN the response MUST be 404

### Requirement: Endpoint Classification Boundaries

The first implementation slice MUST NOT blindly tenant-filter public/global endpoints. `companies`, `modules`, `companies/add-module`, `auth/login`, `auth/refresh`, and `auth/logout` are out of scope except for preserving their current category.

#### Scenario: Out-of-scope endpoints are not changed by this slice
- GIVEN this change is applied
- WHEN public auth or global/admin endpoints are exercised
- THEN behavior MUST NOT be changed solely by farm/lot tenant enforcement

## Acceptance Criteria Mapped to Tests

| AC | Test target |
|----|-------------|
| Farm routes require JWT | Controller/e2e tests assert 401 for unauthenticated `/farms`. |
| Farm tenant isolation | Repository/use-case/e2e tests assert scoped list, 404 cross-tenant read/update, JWT-derived create/update tenant. |
| Lot tenant isolation | Tests assert transitive farm ownership filters, 404 cross-tenant target, 400 cross-tenant `farmId`. |
| Client contract | Contract tests/docs assert bearer token required and request `companyId` is non-authoritative. |
| Endpoint boundaries | Regression tests or review checklist assert auth/global endpoints are not tenant-filtered in this slice. |
