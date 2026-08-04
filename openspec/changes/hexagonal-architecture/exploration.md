# Exploration: Hexagonal Architecture Migration (Strangler Pattern per Module)

**Change**: `hexagonal-architecture`
**Project**: `proyectofinal2026`
**Branch**: `refactor/hexagonal-architecture`
**Date**: 2026-08-04
**Scope**: Backend (`packages/backend`, NestJS 11 + Prisma 7 + PostgreSQL 16) and Mobile (`packages/mobile`, Flutter). Investigation only — no production code written.

## Current State

### Repository layout
- pnpm monorepo (`pnpm-workspace.yaml` → `packages/*`): `backend` (NestJS 11, Prisma 7, PostgreSQL 16, JWT auth, throttler, Redis dep installed but unused), `mobile` (Flutter, login + home + design system), `web` (Flutter skeleton, only `lib/main.dart`).
- `docker-compose.yml` runs `postgres:16-alpine` on port 5432 (db `proyectofinal`, user `devuser`).
- Backend `package.json` scripts: `build` (nest build), `lint` (eslint --fix), `test` (jest, rootDir `src`, ts-jest), `test:e2e` (jest --config ./test/jest-e2e.json), `test:cov`.

### Backend architecture today
- Classic NestJS **3-layer-but-flat**: `Controller → Service → PrismaService` for every module. **No repository layer exists anywhere.** Every service injects `PrismaService` directly (`constructor(private prisma: PrismaService)`) and calls `this.prisma.<model>.*` inline.
- Cross-entity validation is done by making **direct Prisma reads on other modules' models** inside a service (e.g. livestock reads `company` and `lot`).
- **DTOs exist ONLY in auth** (`auth/dto/*.dto.ts` with class-validator). Entity modules use inline TypeScript types in the controller/service. `main.ts` enables a global `ValidationPipe` (whitelist, transform, forbidNonWhitelisted) but entity endpoints rely on manual service-level validation.
- `main.ts`: `app.useGlobalPipes(new ValidationPipe({whitelist:true, transform:true, forbidNonWhitelisted:true}))`; listens on `PORT ?? 3000`. **No global prefix, no CORS setup.**
- `app.module.ts` imports `AuthModule` + 13 entity modules: Company, ModuleEntity, Farm, Lot, Livestock, User, LivestockEvent, WeightRecord, TaskType, Task, Machine, MachineUsage. (LivestockMovement module exists but is NOT registered in AppModule — its controller is not mounted.)

### Prisma (Prisma 7 — new `prisma-client` generator)
- `prisma/schema.prisma`: `generator client { provider = "prisma-client"; output = "./generated" }` → generated code at `packages/backend/prisma/generated/` (`client.ts`, `enums.ts`, `models/`, `internal/`).
- **Import pattern is RELATIVE and MIXED**: services import `../../../prisma/generated/client` (enums/types) and `../../../prisma/generated/enums`; **`user.service.ts` additionally imports `PrismaClientKnownRequestError` from `@prisma/client/runtime/client`** (legacy path — a real risk on Prisma 7).
- `PrismaService` (`src/prisma/prisma.service.ts`) extends `PrismaClient` and injects the `PrismaPg` adapter (`@prisma/adapter-pg`) with `process.env.DATABASE_URL`; `onModuleInit` → `$connect()`.
- Models (14): Company, User, RefreshToken, Farm, Lot, TaskType, Task, Machine, MachineUsage, Module, Livestock, LivestockEvent, WeightRecord, LivestockMovement. Enums (5): UserRole (ADMIN/OPERARIO/PRODUCTOR/CONTRATISTA/VETERINARIO), TaskStatus, LivestockStatus (ACTIVO/VENDIDO/MUERTO/ENFERMO), MachineStatus, EventType.
- Key relationships: Farm→Company, Lot→Farm, Lot→Livestock (`LotLivestock`), Livestock→Company/Lot, LivestockEvent/WeightRecord/LivestockMovement→Livestock + User(operator), Task→Lot/TaskType/User(operators many-to-many), MachineUsage→Machine/Task, User→Company, RefreshToken→User (cascade), Company↔Module (m2m).

## Affected Areas

- `packages/backend/src/entities/*` — all 13 modules (controller/service/module) get repository ports + adapters, module-by-module.
- `packages/backend/src/prisma/*` — PrismaService remains the low-level adapter infrastructure; repos will wrap it.
- `packages/backend/src/auth/*` — auth service has the most complex persistence usage (User + RefreshToken); extraction must preserve lockout/rotation/migration behavior.
- `packages/backend/src/main.ts`, `src/app.module.ts` — wiring only; strangler keeps NestJS DI so changes are additive.
- `packages/backend/prisma/schema.prisma` + `prisma/generated/` — domain layer must stop importing generated enums (or map them) to avoid persistence→domain coupling.
- `packages/mobile/lib/**` — `data/repositories/auth_repository.dart`, `data/services/auth_api_service.dart`, `app/auth/login_view_model.dart`, `main.dart` (manual wiring, no DI).
- `packages/mobile/test/**` — existing tests are the safety net for the mobile refactor.

## Approaches

1. **Full parallel migration of all modules at once**
   - Pros: single coherent change; no long-lived mixed state.
   - Cons: huge diff; no entity unit tests exist to protect the refactor; conflicts with strict_tdd; high regression risk.
   - Effort: High

2. **Strangler pattern, livestock first, per module (recommended)** — extract one module at a time: introduce `LivestockRepository` port + `PrismaLivestockRepository` adapter, keep the NestJS controller, point the module at the adapter, prove with tests, then repeat for CRUD modules, then auth, then mobile.
   - Pros: small reversible increments; matches the existing Kanban plan (Fase 0 baseline, Fase 1 livestock pilot, Fase 2 CRUDs, Fase 3 auth, Fase 4 mobile); each step is testable with strict_tdd; low blast radius (no module currently imports another module's service — only PrismaService).
   - Cons: cross-entity reads (livestock→company/lot) force a decision early on how ports cross module boundaries.
   - Effort: Low per module, Medium overall

3. **Domain-first (extract pure domain layer + use cases before touching persistence)**
   - Pros: cleanest long-term shape.
   - Cons: requires re-architecting validation currently embedded in services; the services use NestJS HTTP exceptions as domain errors, so this is a bigger behavioral change per module.
   - Effort: High

## Livestock Pilot Detail (module being extracted first)

Files:
- `packages/backend/src/entities/livestock/livestock.service.ts` (239 lines)
- `packages/backend/src/entities/livestock/livestock.module.ts` (imports PrismaModule; controller + service; exports LivestockService)
- `packages/backend/src/entities/livestock/livestock.controller.ts` (routes: GET `/livestocks`, GET `/livestocks/:id` [ParseUUIDPipe], POST `/livestocks`, PUT `/livestocks/:id` [ParseUUIDPipe], DELETE `/livestocks/:id` [ParseUUIDPipe]; inline types `CreateLivestockBody`/`UpdateLivestockBody`; uses `LivestockStatus` from `../../../prisma/generated/client`)

Service behavior (must be preserved 1:1):
- **create** (lines 55–110): asserts companyId/tagNumber/species/sex required (`assertRequiredString`); validates company exists (`prisma.company.findUnique` → NotFound); if lotId, validates lot exists with `include: { farm: true }` (→ NotFound) and **ownership: `lot.farm.companyId !== data.companyId` → BadRequest `'Lot must belong to the same company as the livestock'`**; validates tagNumber uniqueness (`prisma.livestock.findUnique({ where: { tagNumber } })` → Conflict); parses birthDate (`parseDate` → BadRequest on invalid); creates.
- **update** (lines 112–199): rejects empty payload; loads livestock with `include: { lot: { include: { farm: true } } }`; recomputes nextCompanyId/nextLotId; validates changed company exists; validates lot ownership vs nextCompanyId (same message); tagNumber uniqueness excluding self (`findFirst` where tagNumber + `id: { not: id }` → Conflict); species/sex re-asserted if present; partial update built with spreads.
- **remove** (lines 201–218): find → delete → `{ message }`.
- Error policy: rethrows BadRequest/Conflict/NotFound, wraps everything else as InternalServerError with `console.error`.

Prisma `Livestock` model fields used: id (uuid), companyId, lotId (nullable), tagNumber (@unique), breed?, species, birthDate?, sex, status (enum default ACTIVO), entryDate?, version, deleted, createdAt/updatedAt, relations company/lot/events/movements/weights.

### What moves / what breaks for the pilot
Moves:
- Add `LivestockRepository` port (interface) + `PrismaLivestockRepository` adapter implementing it; service depends on the port; module provides the adapter. Controller keeps working unchanged (service method signatures stay identical).
- Port surface must include the cross-entity reads the service currently does on `company` and `lot` (findCompanyById, findLotByIdWithFarm) — decision point below.

Breaks / complications:
- `LivestockStatus` enum imported from `prisma/generated/client` in BOTH service and controller — the domain layer cannot import the generated client; must duplicate the enum in domain and map, or accept the coupling for the pilot.
- Services throw `@nestjs/common` exceptions (NotFound/BadRequest/Conflict) — domain use cases stay tied to NestJS HTTP exceptions (acceptable for a strangler inside NestJS; would need a mapping layer for true hexagon purity).
- **No existing livestock tests** — strict_tdd=true means the pilot requires writing specs first (unit tests for the service against a mocked repository port; optionally e2e).
- Nothing else imports `LivestockModule` or `LivestockService` (verified: entity modules only import `PrismaModule`), so extraction is low blast radius.
- Livestock is referenced by livestock-event / weight-record / livestock-movement, but those modules read `prisma.livestock` directly — they do NOT depend on LivestockService, so they are unaffected until their own extraction.

### Open decision (port granularity for cross-entity reads)
- Option A — **narrow own ports**: the Livestock port includes `findCompanyById`/`findLotByIdWithFarm` methods; the Prisma adapter implements them. Fast, pragmatic, but the livestock port conceptually owns company/lot queries (leaks aggregate boundaries).
- Option B — **reuse exported ports**: Company and Lot modules export ports; livestock depends on them. Cleaner, but company/lot aren't extracted yet → chicken-and-egg; can defer by extracting the port interfaces first with adapters living in the owning modules later.
- Recommendation for pilot: Option A with ports shaped as capability reads (`companyExists(id)`, `findLotWithFarm(id)`), then refactor to B once company/lot are extracted. Keep the API contract identical in either case.

## Backend Module Inventory (persistence pattern)

| Module | Files | Endpoints | Prisma models touched (direct) | Notes |
|---|---|---|---|---|
| `entities/company` | controller, service, module | GET /, GET /:id, POST /, PUT /:id, POST /add-module | company, module | findByCuit; addModule connects module m2m |
| `entities/module-entity` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | module | findByName; throws raw `Error` (not Nest exceptions) |
| `entities/farm` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | farm, company | company ownership check on create/update; name-unique-per-company |
| `entities/lot` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | lot, farm, company, livestock | `addLiveStock` writes BOTH lot.livestock connect AND livestock.lotId (cross-entity write, incomplete: movement record TODO) |
| `entities/livestock` | controller, service, module | GET /, GET /:id, POST /, PUT /:id, DELETE /:id | livestock, company, lot | PILOT; ownership + tagNumber uniqueness + date validation |
| `entities/user` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | user, company | argon2 hashing; P2002 catch; imports `@prisma/client/runtime/client` |
| `entities/livestock-event` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | livestockEvent, livestock, user | vaccine/dose cleared when type ≠ VACUNACION |
| `entities/weight-record` | controller, service, module | GET /, GET /:id, POST /, PUT /:id, DELETE /:id | weightRecord, livestock, user | operator + livestock existence checks |
| `entities/task-type` | controller, service, module | GET /, GET /:id, POST /, PUT /:id, DELETE /:id | taskType, task | validates taskIds via task.findMany |
| `entities/task` | controller, service, module | GET /, GET /:id, POST /, PUT /:id, POST /:id/:operatorId, PUT /:id/:operatorId, DELETE /:id | task, taskType, lot, user | operator role must be OPERARIO; add/removeOperario connect/disconnect |
| `entities/machine` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | machine, company | dates normalized to ISO strings |
| `entities/machine-usage` | controller, service, module | GET /, GET /:id, POST /, PUT /:id | machineUsage, machine, task, user | operator must be assigned to task; machine must be ACTIVA; **bug: `intialFuel` typo field** |
| `entities/livestock-movement` | controller, service, module | GET /, GET /:id, POST / | livestockMovement | minimal CRUD, `data: any`; **not registered in AppModule** |
| `auth` | controller, service, module, strategies, guards, decorators, dto, interfaces | POST /auth/login, POST /auth/refresh, POST /auth/logout | user, refreshToken | local + jwt strategies; throttler 5/min on login |

## Cross-Entity Dependencies (services touching other modules' models)

- `livestock.service` → **company** (findUnique), **lot** (findUnique + include farm)
- `lot.service` → **farm** (findUnique), **company** (findUnique include farms), **livestock** (findUnique/update/connect)
- `farm.service` → **company** (findUnique)
- `user.service` → **company** (findUnique)
- `task.service` → **taskType** (findUnique), **lot** (findUnique), **user** (findUnique, role check)
- `task-type.service` → **task** (findMany id in)
- `weight-record.service` → **user** (findUnique), **livestock** (findUnique)
- `livestock-event.service` → **livestock** (findUnique), **user** (findUnique)
- `machine.service` → **company** (findUnique)
- `machine-usage.service` → **machine** (findUnique), **task** (findUnique include operators), **user** (findUnique)
- `company.service` → **module** (findUnique)
- `auth.service` → **user** (findUnique/update), **refreshToken** (create/findMany/update)

Implication: a per-module strangler cannot isolate persistence reads without either narrow ports (Option A) or exported ports from the referenced modules (Option B). No module imports another module's **service** — coupling is exclusively at the Prisma model level.

## Auth Detail

- `auth.service.ts` (255 lines) injects `PrismaService` + `JwtService`. Constants: MAX_FAILED_ATTEMPTS=5, LOCKOUT_MINUTES=15, ACCESS '15m', REFRESH 7 days.
- `validateUserCredentials(email, password)`: `user.findUnique({where:{email}})` → 401 if missing; active/deleted check; **lockedUntil > now → HTTP 423 with remaining time**; password verify with **argon2 primary + bcrypt legacy fallback + on-success hash migration to argon2**; on failure increments `failedLoginAttempts`, sets `lockedUntil` at 5 attempts (user.update); on success resets counters and migrates hash.
- `login(user)`: signs JWT payload `{sub, role, firmaId: companyId, email}`; creates `refreshToken` (raw = randomBytes(40).hex, stored as argon2 hash, expiresAt +7d).
- `refreshTokens(raw)`: `findMany` non-revoked non-expired **with include user**, then **O(n) argon2.verify scan**; revokes used token (rotation), issues new pair; re-checks user.active/deleted.
- `logout(raw)`: `findMany` non-revoked, scan-verify, revoke.
- `auth.module.ts`: PrismaModule, PassportModule (default 'jwt'), **JwtModule.registerAsync** (secret `process.env.JWT_SECRET`; fixed earlier bug where register() read env too early), ThrottlerModule (10 req/60s global; login 5/60s via `@Throttle` on controller). Providers: AuthService, LocalStrategy, JwtStrategy. Exports AuthService, JwtStrategy, PassportModule, JwtModule.
- `local.strategy.ts`: usernameField 'email' → `validateUserCredentials`.
- `jwt.strategy.ts`: Bearer token, `secretOrKey: process.env.JWT_SECRET || 'super-secret-jwt-key-2026'` (hardcoded fallback — flagged), validate returns `{id, email, role, firmaId}`.
- `guards/roles.guard.ts`: Reflector-based role guard reading `ROLES_KEY`, `UserRole` from generated client. Controllers of entity modules currently do NOT apply JwtAuthGuard/RolesGuard (only auth controller uses guards).
- Persistence usage summary: User (findUnique by email / update for lockout+reset+hash-migration), RefreshToken (create / findMany / update revoke). Cleanest extraction candidate: an `AuthPersistence`/`UserCredentialsRepository` + `RefreshTokenRepository` pair of ports.

## Test Inventory

Backend unit (Jest 29 + ts-jest, `rootDir: src`, `testRegex: .*\.spec\.ts$`):
- `src/auth/auth.service.spec.ts` — mocks PrismaService as a plain object with `jest.fn()` per model (`user`, `refreshToken`) and JwtService; covers lockout (423), failed-attempt increments, reset, login, rotation, logout. Spanish test names.
- `src/auth/auth.controller.spec.ts` — mocks AuthService with jest.fn().
- **No entity module has any unit test** (livestock, company, farm, lot, user, etc. → zero coverage).

Backend e2e (`test/jest-e2e.json`, supertest):
- `test/auth.e2e-spec.ts` — boots AppModule, `overrideProvider(PrismaService)` with a full mock (company/user/refreshToken jest.fn()), ValidationPipe, supertest against `/auth/login|refresh|logout`.
- `test/app.e2e-spec.ts` — default Nest smoke test.

Mobile (flutter_test):
- `test/widget_test.dart` — smoke.
- `test/data/services/auth_api_service_test.dart` — `MockClient` from `package:http/testing`; asserts path/method/body, 200/401/423 paths.
- `test/app/auth/login_view_model_test.dart` — hand-rolled `MockAuthRepository implements AuthRepository`; state + login success/failure.
- `test/app/auth/login_view_test.dart` — widget test with mock repo, `AppTheme.lightTheme`.

Verification commands (reported, not run): `pnpm --filter backend run test` (unit), `pnpm --filter backend run test:e2e`, `pnpm --filter backend run lint`, `pnpm --filter backend run build`; mobile `flutter analyze`, `flutter test`.

## Mobile Detail

Tree (`packages/mobile/lib`):
- `main.dart` — MyApp StatefulWidget; **line 26: `_loginViewModel = LoginViewModel();`** (no args → constructor defaults wire `HttpAuthRepository()` → `AuthApiService()`); swaps `HomeView`/`LoginView` on `_authenticatedUser`; `onLoginSuccess` reads `_loginViewModel.loggedUser`.
- `app/auth/login_view.dart` + `login_view_model.dart` — **ViewModels live under `lib/app/`, NOT `lib/presentation/`** (the prompt's assumed structure is inaccurate: `presentation/` holds design-system components + preview).
- `app/home/home_view.dart` — home shell.
- `presentation/components/**` — buttons, inputs, badges, cards, selectors (design system); `presentation/preview/components_preview_screen.dart`.
- `domain/models/auth_user.dart` — **only domain file: NO `domain/repositories/`, NO `domain/usecases/` yet**.
- `data/repositories/auth_repository.dart` — `abstract class AuthRepository { Future<LoginResponseModel> login({required String email, required String password}); }` + `HttpAuthRepository implements AuthRepository` whose constructor defaults `_apiService = apiService ?? AuthApiService()` (manual DI).
- `data/services/auth_api_service.dart` — `AuthApiService` with injectable `http.Client` + `baseUrl` (defaults `ApiConfig.baseUrl`); `AuthException`, `AccountLockedException` (423, carries remainingSeconds); login/refresh/logout methods.
- `data/models/login_response_model.dart` — LoginResponseModel (accessToken, refreshToken, user AuthUser), fromJson/toJson.
- `core/config/api_config.dart` — baseUrl per platform: web/desktop `http://localhost:3000`, Android emulator `http://10.0.2.2:3000`.
- `core/theme/app_colors.dart`, `app_theme.dart`.

Wiring: `LoginViewModel extends ChangeNotifier`, `LoginViewModel({AuthRepository? authRepository}) : _authRepository = authRepository ?? HttpAuthRepository();` — `login()` → `_authRepository.login(email, password)` → sets `_loggedUser`/`_isLoggedIn`. Client-side `validateInputs()`.

`pubspec.yaml`: dependencies `flutter`, `cupertino_icons ^1.0.8`, `http ^1.6.0`; dev `flutter_test`, `flutter_lints ^5.0.0`. **No DI package (no get_it, no riverpod/provider)** — all wiring is manual constructor defaults; the existing `AuthRepository` abstraction + test seams (MockClient, mock repos) are the natural strangler surface.

## Pilot Readiness (Livestock)

**Readiness: MEDIUM-HIGH.** The module is small (3 files, ~300 lines), self-contained, no service-level consumers, and has clear business rules (ownership, uniqueness, date validation) that map directly to use cases + repository port. Blockers to de-risk before/at extraction:
1. **Zero tests exist** → strict_tdd=true: write `livestock.service.spec.ts` (mock the repository port) before refactoring; add optional e2e for /livestocks.
2. **Enum coupling**: `LivestockStatus` imported from `prisma/generated/client` in service+controller → decide enum strategy (domain copy + mapping) or accept coupling in pilot.
3. **NestJS exceptions in service**: keep `@nestjs/common` exceptions in the pilot (strangler pragmatism); note in design that true hexagon purity would need an exception-mapping port.
4. **Cross-entity reads (company/lot)**: use narrow capability ports in the pilot (Option A); refactor to exported ports when company/lot extract.
5. **API contract freeze**: response shapes and error semantics must stay byte-identical (tests should lock them).
6. **DTO gap**: no class-validator DTOs for livestocks — body validation is manual in the service; preserve `assertRequiredString`/`parseDate` behavior exactly when moving into the use case layer.
7. **Prisma import hygiene**: normalize generated-client imports; fix `@prisma/client/runtime/client` usage in user.service (Prisma 7 legacy path risk) — can be done in pilot or a separate chore.

## Risks

- **No entity unit tests** → refactor safety net only exists for auth. strict_tdd mitigates forward, but existing behavior is protected by zero tests.
- **Mixed Prisma import paths** (`../../../prisma/generated/*` vs `@prisma/client/runtime/*`) — fragile under Prisma 7; flag `user.service.ts`.
- **Inline-typed DTOs + global forbidNonWhitelisted** — entity bodies never hit class-validator; manual service validation is the real contract; extraction must not change validation behavior.
- **Auth service complexity** (lockout 423 payload, bcrypt→argon2 migration, O(n) refresh scan, rotation) — extraction is behavior-sensitive; only auth has tests; do not "improve" logic during extraction (e.g. leave the O(n) scan alone).
- **Hardcoded JWT fallback secret** in jwt.strategy.ts — pre-existing security debt, out of scope but worth noting.
- **Incomplete/inconsistent modules** — livestock-movement not registered in AppModule; machine-usage has `intialFuel` typo; task.service has non-awaited promise checks (`const taskType = this.prisma.taskType.findUnique(...)` without await). These are pre-existing bugs; strangler should not silently fix them (keep behavior, note separately).
- **Mobile has no DI container** — introducing ports on mobile is straightforward (interfaces already exist for auth), but wiring stays manual; no DI package decision has been made.
- **Behavior drift during refactor** — mitigate with contract-locking tests per module before touching code.

## Recommendation

Strangler pattern, livestock first (Approach 2). Sequence: (0) baseline tests + fix Prisma import hygiene; (1) livestock pilot: repository port + adapter, service-on-port, unit tests; (2) CRUD modules in waves (company/module → farm/lot → user → events/weights → task/task-type → machine/machine-usage → movement); (3) auth extraction (UserCredentials + RefreshToken ports) last among backend modules; (4) mobile: introduce `AuthRepository` DI wiring (keep interface, add explicit composition at `main.dart`) and repeat the pattern for future screens. Freeze API contracts per module; keep NestJS HTTP exceptions in use cases during the transition.

## Ready for Proposal

**Yes.** The investigation is complete: full module inventory, persistence patterns, cross-entity dependency map, auth detail, test inventory, mobile wiring, and pilot-readiness assessment are captured. The orchestrator should instruct sdd-propose to define: (a) the pilot scope for livestock with the port/adapter shape, (b) the narrow-vs-exported ports decision (Option A pilot → Option B later), (c) enum/exception strategy for the domain layer, (d) test-first contract-locking per module, (e) explicit non-goals (do not fix pre-existing bugs, do not change API semantics, do not add a mobile DI package yet).
