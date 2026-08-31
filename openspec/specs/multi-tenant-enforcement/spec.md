# Multi-Tenant Enforcement Specification

## Purpose

Protect Sprint 1 tenant-owned APIs in the shared PostgreSQL schema. `companyId` is the tenant key, and the effective tenant MUST be `req.user.firmaId` from the authenticated JWT.

## Requirements

### Requirement: Protected Tenant Context

All in-scope operational endpoints for farms, lots, livestocks, livestock-events, livestock-movements, weight-records, tasks, task-types, machines, machine-usages, and tenant-local users MUST require a bearer JWT. The backend MUST derive tenant identity from the token and MUST NOT treat client-supplied `companyId` as authoritative. Flutter clients SHOULD send `Authorization: Bearer <accessToken>` and SHOULD NOT send authoritative tenant identity for protected writes. Client-supplied `companyId` on tenant-scoped writes is deprecated; during Sprint 1 compatibility it MUST be ignored in favor of `req.user.firmaId`, not rejected.

#### Scenario: Farms block unauthenticated access
- GIVEN no valid bearer token is provided
- WHEN the client calls any in-scope `/farms` endpoint
- THEN the response MUST be 401

#### Scenario: Lots block unauthenticated access
- GIVEN no valid bearer token is provided
- WHEN the client calls any in-scope `/lots` endpoint
- THEN the response MUST be 401

#### Scenario: Remaining operational endpoints block unauthenticated access
- GIVEN no valid bearer token is provided
- WHEN the client calls any in-scope remaining operational endpoint
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

### Requirement: TaskType Tenant Ownership

Task types MUST belong to exactly one company. TaskType names MUST be unique per company, not globally. Reads/writes MUST use the authenticated user's `firmaId`; client `companyId` is deprecated/non-authoritative where present.

#### Scenario: Task types are tenant-local
- GIVEN tenants A and B each have a task type named `Vaccination`
- WHEN tenant A calls task-type list/read endpoints
- THEN only tenant A task types MUST be returned or readable

#### Scenario: Task type uniqueness is per company
- GIVEN tenant A already has task type `Vaccination`
- WHEN tenant A creates another `Vaccination`
- THEN the response MUST be 409
- AND tenant B MAY create `Vaccination`

### Requirement: Direct-Owned Entity Tenant Isolation

Livestock and Machine operations MUST scope targets directly by `companyId = req.user.firmaId`. Cross-tenant targets MUST return 404. Body `companyId`, where accepted for compatibility, MUST be ignored in favor of the JWT tenant.

#### Scenario: Direct-owned lists are scoped
- GIVEN tenants A and B have livestock and machines
- WHEN tenant A calls in-scope list endpoints
- THEN no tenant B livestock or machine MUST be returned

#### Scenario: Direct-owned target from another tenant is hidden
- GIVEN a livestock or machine belongs to tenant B
- WHEN tenant A reads, updates, or deletes that id
- THEN the response MUST be 404

### Requirement: Indirect-Owned Entity Tenant Isolation

Task, MachineUsage, LivestockEvent, WeightRecord, and LivestockMovement operations MUST be scoped through their tenant-owned parent graph: Task through Lot/Farm; MachineUsage through Machine and Task; LivestockEvent/WeightRecord through Livestock; LivestockMovement through Livestock and Lot. Cross-tenant targets MUST return 404.

#### Scenario: Indirect-owned lists are scoped by parent graph
- GIVEN tenants A and B have records under their own parent entities
- WHEN tenant A calls any in-scope list endpoint
- THEN every returned record MUST resolve to tenant A through its parent graph

#### Scenario: Indirect-owned target from another tenant is hidden
- GIVEN an indirect-owned record resolves to tenant B
- WHEN tenant A reads, updates, or deletes that id
- THEN the response MUST be 404

### Requirement: Cross-Tenant Relationship Rejection

For in-scope create/update requests, relationship ids in the body MUST belong to the authenticated tenant. Cross-tenant relationship ids MUST return 400 and MUST NOT mutate data.

#### Scenario: Task rejects foreign relations
- GIVEN tenant A is authenticated
- WHEN creating or updating a task with tenant B `lotId`, `taskTypeId`, or assigned `userId`
- THEN the response MUST be 400

#### Scenario: Usage, event, weight, and movement reject foreign relations
- GIVEN tenant A is authenticated
- WHEN a body references tenant B livestock, lot, machine, or task
- THEN the response MUST be 400
- AND no record MUST be created or updated

### Requirement: Tenant-Local User Scope Deferred Admin Policy

Tenant-local user list/read/update surfaces MUST be scoped to `req.user.firmaId`. Cross-tenant user targets MUST return 404. Bootstrap, platform-admin, and cross-company user administration policies are explicitly deferred and MUST NOT be introduced by this change.

#### Scenario: Users are tenant-scoped for normal protected flows
- GIVEN tenants A and B each have users
- WHEN tenant A calls in-scope protected user endpoints
- THEN only tenant A users MUST be visible

### Requirement: Endpoint Classification Boundaries

This change MUST NOT blindly tenant-filter public or platform/global endpoints. `companies`, `modules`, `companies/add-module`, `auth/login`, `auth/refresh`, and `auth/logout` are out of scope except for preserving their current category.

#### Scenario: Out-of-scope endpoints are not changed by this slice
- GIVEN this change is applied
- WHEN public auth or global/admin endpoints are exercised
- THEN behavior MUST NOT be changed solely by remaining-entity tenant enforcement

## Acceptance Criteria Mapped to Tests

| AC | Test target |
|----|-------------|
| In-scope routes require JWT | Controller/e2e tests assert 401 for unauthenticated `/farms`, `/lots`, and remaining operational endpoints. |
| Farm tenant isolation | Repository/use-case/e2e tests assert scoped list, 404 cross-tenant read/update, JWT-derived create/update tenant. |
| Lot tenant isolation | Tests assert transitive farm ownership filters, 404 cross-tenant target, 400 cross-tenant `farmId`. |
| TaskType tenant ownership | Controller/use-case/repository tests assert tenant-local list/read and 409 per-company duplicate names. |
| Direct-owned isolation | Tests assert scoped livestock/machine access and 404 for cross-tenant targets. |
| Indirect-owned isolation | Tests assert Task, MachineUsage, LivestockEvent, WeightRecord, and LivestockMovement traverse tenant-owned parents. |
| Cross-tenant relation rejection | Tests assert 400 for foreign `lotId`, `taskTypeId`, `userId`, `livestockId`, `machineId`, and `taskId` relations. |
| Tenant-local user scope | Tests assert tenant-local list/read/update/create and 404 cross-tenant user targets. |
| Endpoint boundaries | Regression tests or review checklist assert auth/global endpoints are not tenant-filtered by this change. |
