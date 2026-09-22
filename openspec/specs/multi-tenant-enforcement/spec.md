# Multi-Tenant Enforcement Specification

## Purpose

Protect Sprint 1 tenant- and firma-owned APIs in the shared PostgreSQL schema.

The platform has two nested scopes, and the authenticated JWT (`AuthJwtPayload`) carries both:

- `tenantId` is the tenant key: the subscribed customer. Tenant-owned resources — farm, lot, task, task-type, and tenant-local user — MUST be scoped by `req.user.tenantId`.
- `firmaId` is the firma key: a `Company` (razón social) inside a tenant. Firma-owned resources — livestock, machine, machine-usage, livestock-event, weight-record, and livestock-movement — MUST be scoped by `req.user.firmaId`, which equals the owning `companyId`.

The backend MUST derive scope from the token and MUST NOT treat client-supplied `companyId` or tenant/firma identity as authoritative.

## Requirements

### Requirement: Protected Tenant/Firma Context

All in-scope operational endpoints for farms, lots, tasks, task-types, tenant-local users, livestocks, livestock-events, livestock-movements, weight-records, machines, and machine-usages MUST require a bearer JWT. The backend MUST derive scope from the token: tenant-owned resources MUST be scoped by `req.user.tenantId`, and firma-owned resources MUST be scoped by `req.user.firmaId`. The backend MUST NOT treat client-supplied `companyId` or tenant/firma identity as authoritative. Flutter clients SHOULD send `Authorization: Bearer <accessToken>` and SHOULD NOT send authoritative tenant or firma identity for protected writes. Client-supplied `companyId` on tenant-scoped writes is deprecated; during Sprint 1 compatibility it MUST be ignored in favor of `req.user.tenantId`, not rejected.

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

Farm list, read, create, and update operations MUST be scoped to the authenticated user's `tenantId`. Because a farm belongs to a client that belongs to a tenant, farm scope MUST resolve through the client's `tenantId`. Cross-tenant farm reads/updates MUST return 404 to avoid revealing existence.

#### Scenario: Farm list returns only current tenant farms
- GIVEN tenant A and tenant B both have farms
- WHEN tenant A calls `GET /farms`
- THEN every returned farm MUST resolve to tenant A through its client's `tenantId`
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

Lot list, read, create, and update operations MUST be scoped through the lot's farm and client to the authenticated user's `tenantId`. Cross-tenant lot lookup/update targets MUST return 404; invalid cross-tenant farm relations in request bodies MUST return 400.

#### Scenario: Lot list returns only lots under current tenant farms
- GIVEN tenants A and B each have farms and lots
- WHEN tenant A calls `GET /lots`
- THEN every returned lot MUST resolve to tenant A through its farm's client `tenantId`

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

Task types MUST belong to exactly one tenant. TaskType names MUST be unique per tenant, not globally. Reads/writes MUST use the authenticated user's `tenantId`; client `companyId` is deprecated/non-authoritative where present.

#### Scenario: Task types are tenant-local
- GIVEN tenants A and B each have a task type named `Vaccination`
- WHEN tenant A calls task-type list/read endpoints
- THEN only tenant A task types MUST be returned or readable

#### Scenario: Task type uniqueness is per tenant
- GIVEN tenant A already has task type `Vaccination`
- WHEN tenant A creates another `Vaccination`
- THEN the response MUST be 409
- AND tenant B MAY create `Vaccination`

### Requirement: Task Tenant Isolation Through Lot/Farm Ownership

Task list, read, create, update, delete, and operator-assignment operations MUST be scoped through the task's lot and farm to the authenticated user's `tenantId`. Cross-tenant task targets MUST return 404. Task relationship bodies MUST reference tenant-owned lots, task types, and users, or the request MUST fail per the Cross-Tenant Relationship Rejection requirement.

#### Scenario: Task list returns only tasks under current tenant farms
- GIVEN tenants A and B each have tasks under their own farms
- WHEN tenant A calls `GET /tasks`
- THEN every returned task MUST resolve to tenant A through its lot and farm

#### Scenario: Task read hides another tenant task
- GIVEN a task exists under tenant B's farm
- WHEN tenant A calls `GET /tasks/:id` with that task id
- THEN the response MUST be 404

### Requirement: Direct-Owned Entity Firma Isolation

Livestock and Machine operations MUST scope targets directly by `companyId = req.user.firmaId`. Cross-firma targets MUST return 404. Body `companyId`, where accepted for compatibility, MUST be ignored in favor of the JWT `firmaId`.

#### Scenario: Direct-owned lists are scoped
- GIVEN firmas A and B have livestock and machines
- WHEN firma A calls in-scope list endpoints
- THEN no firma B livestock or machine MUST be returned

#### Scenario: Direct-owned target from another firma is hidden
- GIVEN a livestock or machine belongs to firma B
- WHEN firma A reads, updates, or deletes that id
- THEN the response MUST be 404

### Requirement: Indirect-Owned Entity Firma Isolation

MachineUsage, LivestockEvent, WeightRecord, and LivestockMovement operations MUST be scoped by `req.user.firmaId` through their firma-owned parent graph: MachineUsage through Machine and Task; LivestockEvent/WeightRecord through Livestock; LivestockMovement through Livestock and Lot. Cross-firma targets MUST return 404.

#### Scenario: Indirect-owned lists are scoped by parent graph
- GIVEN firmas A and B have records under their own parent entities
- WHEN firma A calls any in-scope list endpoint
- THEN every returned record MUST resolve to firma A through its parent graph

#### Scenario: Indirect-owned target from another firma is hidden
- GIVEN an indirect-owned record resolves to firma B
- WHEN firma A reads, updates, or deletes that id
- THEN the response MUST be 404

### Requirement: Cross-Tenant/Cross-Firma Relationship Rejection

For in-scope create/update requests, relationship ids in the body MUST belong to the authenticated scope: `tenantId` for tenant-owned resources and `firmaId` for firma-owned resources. Out-of-scope relationship ids MUST return 400 and MUST NOT mutate data.

#### Scenario: Task rejects foreign relations
- GIVEN tenant A is authenticated
- WHEN creating or updating a task with tenant B `lotId`, `taskTypeId`, or assigned `userId`
- THEN the response MUST be 400

#### Scenario: Usage, event, weight, and movement reject foreign relations
- GIVEN firma A is authenticated
- WHEN a body references firma B livestock, lot, machine, task, or user
- THEN the response MUST be 400
- AND no record MUST be created or updated

### Requirement: Tenant-Local User Scope Deferred Admin Policy

Tenant-local user list/read/update surfaces MUST be scoped to `req.user.tenantId`. Cross-tenant user targets MUST return 404. Bootstrap, platform-admin, and cross-tenant user administration policies are explicitly deferred and MUST NOT be introduced by this change.

#### Scenario: Users are tenant-scoped for normal protected flows
- GIVEN tenants A and B each have users
- WHEN tenant A calls in-scope protected user endpoints
- THEN only tenant A users MUST be visible

### Requirement: Explicit Firma User Provisioning and Firma-Scoped Role Authority

`POST /users` MUST require an explicit `companyId`, MUST validate that the company belongs to the caller's `tenantId`, and MUST create a `UserCompany` membership linking the new user to that company in the same provisioning flow. `UserCompany.role` MUST be authoritative for firma-scoped authorization; the legacy `User.role` MUST NOT be used to authorize firma-scoped access. A `companyId` that does not belong to the caller's tenant MUST be rejected without creating a user or membership.

#### Scenario: Provisioning creates a validated firma membership
- GIVEN tenant A is authenticated
- WHEN tenant A calls `POST /users` with a `companyId` that belongs to tenant A
- THEN the created user MUST belong to tenant A
- AND a `UserCompany` membership MUST exist linking that user to the given company

#### Scenario: Provisioning rejects a foreign-tenant company
- GIVEN tenant A is authenticated and `companyId` belongs to tenant B
- WHEN tenant A calls `POST /users` with that `companyId`
- THEN the response MUST be 404
- AND no user and no membership MUST be created

#### Scenario: Firma-scoped authorization uses the membership role
- GIVEN a user has an active `UserCompany` membership with a role
- WHEN firma-scoped authorization is evaluated for that user
- THEN `UserCompany.role` MUST be authoritative for the decision

### Requirement: Login and Refresh Active-Firma Selection Limitation

Login and refresh MUST resolve the active firma from the user's first active `UserCompany` membership ordered by `createdAt ASC` (adapter query orders by `createdAt: 'asc'` and takes one). The issued JWT MUST carry that resolved `firmaId` alongside `tenantId`. If the user has no active firma membership, login and refresh MUST fail and MUST NOT issue a token. The login request does not accept a user-selected active firma yet, so a user with multiple active memberships is always authenticated into the earliest-created one. This is an explicit limitation and follow-up, NOT intended final UX; a future change SHOULD add explicit firma selection at login.

#### Scenario: Default firma is the earliest active membership
- GIVEN a user has multiple active `UserCompany` memberships
- WHEN the user logs in
- THEN the issued JWT MUST carry the `firmaId` of the active membership with the earliest `createdAt`

#### Scenario: Missing active membership blocks login and refresh
- GIVEN a user has no active `UserCompany` membership
- WHEN the user logs in or refreshes a session
- THEN the request MUST fail
- AND no token MUST be issued

#### Scenario: No user-selected firma at login yet
- GIVEN the login request carries no firma selection field
- WHEN a user with multiple active memberships logs in
- THEN the backend MUST use the default earliest-created active membership
- AND the response MUST NOT offer a firma selection

### Requirement: Endpoint Classification Boundaries

This change MUST NOT blindly tenant-filter public or platform/global endpoints. `companies`, `modules`, `companies/add-module`, `auth/login`, `auth/refresh`, and `auth/logout` are out of scope except for preserving their current category.

#### Scenario: Out-of-scope endpoints are not changed by this slice
- GIVEN this change is applied
- WHEN public auth or global/admin endpoints are exercised
- THEN behavior MUST NOT be changed solely by remaining-entity tenant/firma enforcement

## Acceptance Criteria Mapped to Tests

| AC | Test target |
|----|-------------|
| In-scope routes require JWT | Controller/e2e tests assert 401 for unauthenticated `/farms`, `/lots`, and remaining operational endpoints. |
| Farm tenant isolation | Repository/use-case/e2e tests assert scoped list, 404 cross-tenant read/update, JWT `tenantId`-derived create/update tenant. |
| Lot tenant isolation | Tests assert transitive farm/client tenant ownership filters, 404 cross-tenant target, 400 cross-tenant `farmId`. |
| TaskType tenant ownership | Controller/use-case/repository tests assert tenant-local list/read and 409 per-tenant duplicate names. |
| Task tenant isolation | Tests assert Task traverses its tenant-owned lot and farm, and 404 for cross-tenant tasks. |
| Direct-owned isolation | Tests assert scoped livestock/machine access by `firmaId` and 404 for cross-firma targets. |
| Indirect-owned isolation | Tests assert MachineUsage, LivestockEvent, WeightRecord, and LivestockMovement traverse firma-owned parents. |
| Cross-tenant relation rejection | Tests assert 400 for foreign `lotId`, `taskTypeId`, `userId`, `livestockId`, `machineId`, and `taskId` relations. |
| Tenant-local user scope | Tests assert tenant-local list/read/update/create and 404 cross-tenant user targets. |
| Explicit firma provisioning | Tests assert `POST /users` requires `companyId`, rejects foreign-tenant companies, creates `UserCompany`, and treats `UserCompany.role` as authoritative. |
| Active-firma login limitation | Tests assert JWT carries the earliest active membership `firmaId` and login/refresh fail with no active membership. |
| Endpoint boundaries | Regression tests or review checklist assert auth/global endpoints are not tenant-filtered by this change. |
