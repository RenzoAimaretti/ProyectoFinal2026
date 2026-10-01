# Delta for Multi-Tenant Enforcement

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Protected Tenant Context

All in-scope operational endpoints for farms, lots, livestocks, livestock-events, livestock-movements, weight-records, tasks, task-types, machines, machine-usages, and tenant-local users MUST require a bearer JWT. The backend MUST derive tenant identity from the token and MUST NOT treat client-supplied `companyId` as authoritative. Flutter clients SHOULD send `Authorization: Bearer <accessToken>` and SHOULD NOT send authoritative tenant identity for protected writes. Client-supplied `companyId` on tenant-scoped writes is deprecated; during Sprint 1 compatibility it MUST be ignored in favor of `req.user.firmaId`, not rejected.
(Previously: only farm and lot endpoints were listed for this slice.)

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

### Requirement: Endpoint Classification Boundaries

This change MUST NOT blindly tenant-filter public or platform/global endpoints. `companies`, `modules`, `companies/add-module`, `auth/login`, `auth/refresh`, and `auth/logout` are out of scope except for preserving their current category.
(Previously: the boundary was stated for the first farm/lot implementation slice.)

#### Scenario: Out-of-scope endpoints are not changed by this slice
- GIVEN this change is applied
- WHEN public auth or global/admin endpoints are exercised
- THEN behavior MUST NOT be changed solely by remaining-entity tenant enforcement
