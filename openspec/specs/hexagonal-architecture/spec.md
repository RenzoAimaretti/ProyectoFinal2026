# Specification: Hexagonal Architecture Migration (Strangler Pattern per Module)

**Change**: `hexagonal-architecture` | **Project**: `proyectofinal2026` | **Branch**: `refactor/hexagonal-architecture`
**Type**: Delta spec for the change (no pre-existing `openspec/specs/` — all capabilities new). RFC 2119 keywords; scenarios in Given/When/Then.

## 1. Scope Recap

**In scope**: F0 baseline conventions + green baseline; F1 livestock pilot; F2 the 12 remaining CRUD modules in waves; F3 auth extraction; F4 mobile composition root. Persistence-decoupling only — services become the application layer; no pure domain/use-case layer yet.

**Non-goals**: fix pre-existing bugs (livestock-movement unregistered in AppModule, `intialFuel` typo, hardcoded JWT fallback secret, legacy `@prisma/client/runtime/client` import in user.service.ts); change API semantics; introduce pure domain layer/use cases/exception-mapping port; add a mobile DI package; add test-double libraries; change Prisma/schema.

## 2. Requirements by Phase

### F0 — Baseline & Conventions
| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-F0-01 | `docs/hexagonal-conventions.md` SHALL document module layout (`ports/`, `domain/`, `adapters/outbound/prisma/`, service/controller/module), `Symbol` token naming, and the `prisma/generated` import boundary. | must |
| REQ-F0-02 | An eslint boundary rule MUST be active so that no `src/` file outside `**/adapters/**` + `src/prisma/**` imports `prisma/generated`; `pnpm --filter backend run lint` MUST pass with it. | must |
| REQ-F0-03 | Generated-client import paths in touched files MUST be normalized; the legacy `user.service.ts` runtime import MUST remain untouched in F0. | must |
| REQ-F0-04 | `pnpm --filter backend run test` MUST pass green before any refactor (baseline gate). | must |
| REQ-F0-05 | Baseline `test:e2e` and `build` SHOULD pass before F1 starts. | should |

### F1 — Livestock Pilot
| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-F1-01 | A contract-locking `livestock.service.spec.ts` MUST be written BEFORE the refactor (strict_tdd) against mocked ports, freezing the REQ-C rules. | must |
| REQ-F1-02 | `LivestockRepositoryPort` interface + `export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY')` MUST exist in `ports/` with the REQ-A-02 method set. | must |
| REQ-F1-03 | `CompanyLookupPort.companyExists` + Symbol and `LotLookupPort.findLotWithFarm` + Symbol MUST exist (narrow capability ports, per D1 Option A). | must |
| REQ-F1-04 | `PrismaLivestockRepository` adapter MUST live under `adapters/outbound/prisma/` and be the only livestock file importing `prisma/generated`. | must |
| REQ-F1-05 | `domain/livestock-status.ts` MUST define a `LivestockStatus` copy with the 4 identical member names; the adapter MUST map generated enum ↔ domain enum; the controller MUST import only the domain copy. | must |
| REQ-F1-06 | `LivestockService` MUST inject the ports (no `PrismaService`); its public method signatures MUST be unchanged. | must |
| REQ-F1-07 | `livestock.module.ts` MUST wire `{ provide: LIVESTOCK_REPOSITORY, useClass: PrismaLivestockRepository }` plus the capability-port providers. | must |
| REQ-F1-08 | The controller MUST change only the `LivestockStatus` import path (no route/decorator/signature/type change). | must |
| REQ-F1-09 | After the pilot: `pnpm --filter backend run test`, `lint`, and `build` MUST all be green. | must |
| REQ-F1-10 | An optional `/livestocks` e2e SHOULD be added via `supertest`. | should |

### F2 — Twelve CRUD Modules
| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-F2-01 | All 12 modules (company, module-entity, farm, lot, user, livestock-event, weight-record, task-type, task, machine, machine-usage, livestock-movement) MUST be extracted in the wave order from the proposal, each following the F1 per-module sequence. | must |
| REQ-F2-02 | Each module MUST have its contract-locking spec written before its refactor (strict_tdd). | must |
| REQ-F2-03 | Cross-entity reads MUST use the owning module's exported port when already extracted, otherwise a narrow capability port replaced later; the API contract MUST be identical either way. | must |
| REQ-F2-04 | After its wave, no service among the 12 MUST import `PrismaService` or `prisma/generated`. | must |
| REQ-F2-05 | End state: zero `src/` files outside `**/adapters/**` + `src/prisma/**` import `prisma/generated`. | must |
| REQ-F2-06 | Pre-existing tests MUST stay green after every wave; no test may be deleted or weakened. | must |

### F3 — Auth Extraction
| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-F3-01 | `UserCredentialsRepository` (`findByEmail`, `update`) and `RefreshTokenRepository` (`create`, `findActiveWithUser`, `revoke`) ports + Symbols MUST exist; `AuthService` MUST inject them. | must |
| REQ-F3-02 | `auth.service.spec.ts` MUST migrate from mocking `PrismaService` to mocking the ports (plain objects + `jest.fn()`); no test coverage may be lost. | must |
| REQ-F3-03 | NO logic improvements: O(n) refresh-token scan, 423 lockout payload (remaining time), bcrypt→argon2 hash migration, MAX_FAILED_ATTEMPTS=5, LOCKOUT_MINUTES=15, rotation, and active/deleted re-checks MUST behave byte-identically. | must |
| REQ-F3-04 | `auth.module.ts` MUST wire the port providers; `lint`/`test`/`build` MUST stay green. | must |

### F4 — Mobile Composition Root
| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-F4-01 | `main.dart` MUST construct `HttpAuthRepository` → `LoginViewModel` explicitly at the top and pass them via constructors (no hidden defaults). | must |
| REQ-F4-02 | `domain/repositories/auth_repository.dart` MUST host (or relocate/re-export) the `AuthRepository` interface; its `login({required email, required password})` signature MUST be unchanged. | must |
| REQ-F4-03 | No behavior change in `AuthRepository`/`LoginViewModel`: login flow, error mapping (`AuthException`, `AccountLockedException`), and `validateInputs()` MUST be preserved. | must |
| REQ-F4-04 | Only manual DI MUST be used — no get_it/riverpod/provider package added. | must |
| REQ-F4-05 | `flutter analyze` and `flutter test` MUST pass green. | must |

## 3. Behavior Contract Requirements (API Freeze)

| ID | Requirement |
|----|-------------|
| REQ-C-01 | Routes, HTTP methods, and controller signatures MUST remain byte-identical for every module (only import-path changes allowed). |
| REQ-C-02 | Response shapes MUST remain byte-identical: full row shapes from reads/writes, and `{ message: 'Livestock with id X deleted successfully' }` from remove. |
| REQ-C-03 | Error statuses and messages MUST remain byte-identical: company missing → 404 `Company with id X not found`; lot missing → 404 `Lot with id X not found`; ownership mismatch → 400 `Lot must belong to the same company as the livestock`; duplicate tagNumber → 409 `Livestock with this tagNumber already exists`; invalid birthDate → 400 `birthDate must be a valid date`; required field → 400 `${fieldName} is required`; empty update → 400 `No data provided for update`; unexpected errors → 500 `Error creating/updating/fetching/deleting livestock`. |
| REQ-C-04 | `assertRequiredString` MUST reject non-string or trim-empty values with BadRequest `${fieldName} is required` (create: companyId, tagNumber, species, sex; update: tagNumber/species/sex when present). |
| REQ-C-05 | `parseDate` MUST return `undefined` for undefined/null/''; pass through `Date` instances; parse strings via `new Date(value)`; throw BadRequest `birthDate must be a valid date` when `getTime()` is NaN. |
| REQ-C-06 | Update MUST recompute `nextCompanyId`/`nextLotId` before ownership checks, and tagNumber uniqueness MUST exclude self (`id: { not: id }`). |
| REQ-C-07 | Create MUST normalize `lotId ?? null` and `breed ?? null`; update MUST build partial data with spreads so undefined fields are omitted. |
| REQ-C-08 | Rethrow policy MUST be preserved per method: BadRequest/Conflict/NotFound rethrown; everything else `console.error` + InternalServerError. |

## 4. Architecture Requirements

| ID | Requirement |
|----|-------------|
| REQ-A-01 | Every module MUST define ports as interfaces + `export const {MODULE}_REPOSITORY = Symbol('...')` in `ports/`; binding MUST use the Symbol as the injection token. |
| REQ-A-02 | `LivestockRepositoryPort` MUST expose exactly: `findAll`, `findById`, `findByIdWithLotFarm` (update path loads `lot.farm`), `findByTagNumber`, `findByTagNumberExcluding`, `create`, `update`, `delete` — returning an application-layer `LivestockEntity` (full row shape byte-identical to today's Prisma returns). |
| REQ-A-03 | `CompanyLookupPort.companyExists(id): Promise<boolean>`; `LotLookupPort.findLotWithFarm(id): Promise<{ id, farm: { companyId } } \| null>`. |
| REQ-A-04 | Adapters MUST live under `adapters/outbound/prisma/`; `prisma/generated` MUST be importable only from `**/adapters/**` + `src/prisma/**` (eslint-enforced). |
| REQ-A-05 | `LivestockStatus` MUST have a `domain/` copy (ACTIVO/VENDIDO/MUERTO/ENFERMO, identical member names) with adapter mapping; services/controllers MUST never import the generated enum. |
| REQ-A-06 | Services MUST keep `@nestjs/common` exceptions (NotFound/BadRequest/Conflict/InternalServerError); no exception-mapping port. |
| REQ-A-07 | Controller decorators, params, and DTO handling MUST be unchanged (import-path-only diff). |
| REQ-A-08 | Module providers MUST use `[{ provide: TOKEN, useClass: Adapter }]` shape for each extracted port. |

## 5. Testing Requirements

| ID | Requirement |
|----|-------------|
| REQ-T-01 | strict_tdd=true: the contract-locking spec MUST be written BEFORE each module's refactor; runner `pnpm --filter backend run test`. |
| REQ-T-02 | Contract-locking specs MUST assert error statuses/messages, response shapes, ownership rules, tagNumber uniqueness, and date parsing exactly as frozen. |
| REQ-T-03 | Unit tests MUST mock ports with plain objects + `jest.fn()` (pattern from `auth.service.spec.ts`); no test-double library. |
| REQ-T-04 | Existing tests MUST stay green at every phase boundary; no deletions. |
| REQ-T-05 | F1 MUST ship `livestock.service.spec.ts` with a fake repository port covering create/update/remove/find rules (REQ-C-03..REQ-C-08). |
| REQ-T-06 | F3 MUST migrate auth specs to port mocks, keeping coverage of lockout (423), failed-attempt increment/reset, login, rotation, and logout. |
| REQ-T-07 | F4 MUST keep `flutter analyze` and `flutter test` green with existing mobile tests unchanged in behavior. |

## 6. Scenarios

### Livestock — create
- **SC-LV-01 (happy)** — GIVEN a company exists and a lot whose farm belongs to that company, WHEN POST `/livestocks` with a valid body and non-existent tagNumber, THEN 201 returns the created livestock row AND no duplicate check fires.
- **SC-LV-02 (company missing)** — GIVEN no company with the given id, WHEN creating livestock, THEN 404 `Company with id X not found`.
- **SC-LV-03 (lot missing)** — GIVEN company exists but no lot with the given id, WHEN creating livestock with lotId, THEN 404 `Lot with id X not found`.
- **SC-LV-04 (ownership)** — GIVEN a lot whose farm.companyId differs from the body's companyId, WHEN creating livestock, THEN 400 `Lot must belong to the same company as the livestock`.
- **SC-LV-05 (duplicate tagNumber)** — GIVEN an existing livestock with the same tagNumber, WHEN creating, THEN 409 `Livestock with this tagNumber already exists`.
- **SC-LV-06 (invalid birthDate)** — GIVEN a body with `birthDate: 'not-a-date'`, WHEN creating, THEN 400 `birthDate must be a valid date`.
- **SC-LV-07 (required field)** — GIVEN a body missing species, WHEN creating, THEN 400 `species is required`.

### Livestock — update
- **SC-LV-08 (happy)** — GIVEN an existing livestock, WHEN PUT `/livestocks/:id` with a valid partial body, THEN 200 returns the updated row AND only provided fields change.
- **SC-LV-09 (empty payload)** — GIVEN a body with all fields undefined, WHEN updating, THEN 400 `No data provided for update`.
- **SC-LV-10 (missing livestock)** — GIVEN no livestock with the id, WHEN updating, THEN 404 `Livestock with id X not found`.
- **SC-LV-11 (duplicate excluding self)** — GIVEN another livestock with the target tagNumber and the current id keeps its own tagNumber, WHEN updating tagNumber, THEN 409 `Livestock with this tagNumber already exists` AND the check used `id: { not: id }`.
- **SC-LV-12 (ownership vs nextCompanyId)** — GIVEN update changes companyId, WHEN the new lot's farm belongs to the new companyId, THEN 200; GIVEN it doesn't, THEN 400 `Lot must belong to the same company as the livestock`.

### Livestock — remove / find
- **SC-LV-13 (remove happy)** — GIVEN an existing livestock, WHEN DELETE `/livestocks/:id`, THEN 200 `{ message: 'Livestock with id X deleted successfully' }`.
- **SC-LV-14 (remove missing)** — GIVEN no livestock with the id, WHEN deleting, THEN 404 `Livestock with id X not found`.
- **SC-LV-15 (findOne missing)** — GIVEN no livestock with the id, WHEN GET `/livestocks/:id`, THEN 404 `Livestock with id X not found`.

### Auth (F3 freeze)
- **SC-AUTH-01 (lockout)** — GIVEN 5 failed attempts, WHEN login with correct password before lockout expiry, THEN HTTP 423 with the remaining lockout time, byte-identical payload.
- **SC-AUTH-02 (rotation + migration)** — GIVEN a valid refresh token stored with a bcrypt hash, WHEN refreshing, THEN the used token is revoked, a new pair is issued, AND the password hash migrates to argon2 on successful password login.

### Mobile (F4)
- **SC-MOB-01 (composition root)** — GIVEN `main.dart` constructs `HttpAuthRepository()` then `LoginViewModel(authRepository: httpAuthRepository)`, WHEN the app boots and the user logs in, THEN the login flow produces the same state transitions as today's default wiring.

## 7. Out of Scope / Non-Requirements

- Pre-existing bugs stay untouched: livestock-movement unregistered in AppModule; `intialFuel` typo; hardcoded JWT fallback secret; legacy `user.service.ts` runtime import (resolves naturally into its F2 adapter, untouched in F0).
- No API semantics change: routes, shapes, error messages/statuses, validation, DTO handling.
- No pure domain layer / use cases / exception-mapping port.
- No mobile DI package (get_it/riverpod/provider).
- No test-double library; no Prisma/schema/DB migration changes.
- Refactor MUST NOT "improve" logic during extraction (e.g., leave the O(n) refresh scan alone).
