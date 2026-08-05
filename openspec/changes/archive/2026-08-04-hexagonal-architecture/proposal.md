# Proposal: Hexagonal Architecture Migration (Strangler Pattern per Module)

**Change**: `hexagonal-architecture` | **Project**: `proyectofinal2026` | **Branch**: `refactor/hexagonal-architecture`

## Intent

Decouple persistence from application logic so backend services become fast to unit-test with fakes, each module can evolve independently, and mobile mirrors the same ports-and-adapters shape. Today every service injects `PrismaService` and calls `this.prisma.<model>.*` inline — services can't be tested without a database, cross-entity reads leak Prisma models across module boundaries, and `prisma/generated` types (enums, row shapes) leak into HTTP controllers and services. The change introduces repository ports + Prisma adapters module-by-module (strangler), freezing API contracts with tests before each refactor. Persistence-decoupling only: services become the application layer; no pure domain/use-case layer yet.

## Scope

### In Scope
- F0: baseline conventions (port/adapter layout, Symbol binding, import boundary rules) + green test baseline.
- F1: livestock pilot — `LivestockRepositoryPort` + capability ports + `PrismaLivestockRepository` adapter; service on ports; unit tests.
- F2: extract the 12 remaining CRUD modules (company, module-entity, farm, lot, user, livestock-event, weight-record, task-type, task, machine, machine-usage, livestock-movement) in waves, same per-module sequence.
- F3: auth extraction (`UserCredentialsRepository` + `RefreshTokenRepository` ports).
- F4: mobile — explicit composition root in `main.dart`; keep `AuthRepository` interface; no behavior change.
- Port binding via `Symbol` injection tokens; adapters under `adapters/outbound/prisma/`; `prisma/generated` importable ONLY from adapters + `src/prisma/**`.

### Out of Scope
- Do NOT fix pre-existing bugs: livestock-movement unregistered in AppModule; `intialFuel` typo; hardcoded JWT fallback secret; legacy `@prisma/client/runtime/client` import in `user.service.ts` (moves to adapter naturally during F2 user extraction, untouched in F0).
- Do NOT change API semantics: response shapes, error messages/statuses, validation behavior (`assertRequiredString`/`parseDate`), routes, DTO handling.
- No pure domain layer / use cases / exception-mapping port yet.
- No DI package (get_it/riverpod/provider) for mobile.
- No test double (jest-mock-extended etc.) or Prisma change.

## Capabilities

> No existing specs in `openspec/specs/` — all capabilities are new. sdd-spec consumes these.

### New Capabilities
- `backend-persistence-ports`: port/adapter conventions, Symbol binding, import boundary rules (F0–F3).
- `livestock-management`: freeze livestock CRUD behavior contract (F1 pilot).
- `entity-crud-contracts`: per-module behavior freeze for the 12 CRUD modules (F2).
- `auth-management`: freeze auth behavior during extraction (F3).
- `mobile-repository-ports`: mobile composition-root + repository port conventions (F4).

### Modified Capabilities
- None (pure internal refactor; behavior contracts frozen, not changed).

## Approach

Strangler per module. Per-module sequence: (1) write contract-locking tests against the port (strict_tdd — tests BEFORE code); (2) extract port interface + Symbol token; (3) implement Prisma adapter; (4) refactor service to inject ports; (5) wire module providers; (6) verify (unit + e2e + lint + build). Controllers change only by import path (never behavior). Layout per module:

```
src/entities/{module}/
  ports/            # interfaces + export const {MODULE}_REPOSITORY = Symbol('...')
  domain/           # enum copies (e.g. livestock-status.ts)
  adapters/outbound/prisma/   # only place importing prisma/generated
  {module}.service.ts         # application layer: injects ports
  {module}.controller.ts      # unchanged behavior
  {module}.module.ts          # providers: [{provide: TOKEN, useClass: Adapter}]
```

## Key Decisions

| # | Decision | Chosen | Rationale | Alternatives |
|---|----------|--------|-----------|--------------|
| D1 | Cross-entity read ports | **Option A (narrow capability ports)** for pilot → Option B (reuse exported ports) in F2 when owning modules extract | Company/lot not yet extracted → chicken-and-egg; capability reads (`companyExists`, `findLotWithFarm`) keep the pilot moving; mechanical swap to imported ports later; API contract identical either way | Option B now (blocked); one fat aggregate port (leaks boundaries) |
| D2 | `LivestockStatus` enum | **Domain copy + mapping in adapter** | Core goal is services stop importing `prisma/generated` — keeping the enum import defeats the pilot; 4-member copy + trivial map; controller changes only its import line (same member names → type-compatible, zero behavior change) | Accept coupling (defers decoupling, fails pilot purpose) |
| D3 | Exceptions | **Keep `@nestjs/common` exceptions in services** (strangler pragmatism) | Services are the application layer inside NestJS; HTTP exceptions ARE the contract — freezing semantics beats hexagon purity; mapping port deferred | Pure exception-mapping port (behavior-change risk, defer) |
| D4 | Port shape | `LivestockRepositoryPort`: `findAll`, `findById`, `findByIdWithLotFarm` (update path loads lot.farm), `findByTagNumber`, `findByTagNumberExcluding`, `create`, `update`, `delete` — returns application-layer `LivestockEntity` (full row shape, byte-identical to today's Prisma returns). `CompanyLookupPort.companyExists(id)`. `LotLookupPort.findLotWithFarm(id)` → `{id, farm:{companyId}} \| null` | Every service Prisma call maps to exactly one port method; update path needs the include-loaded aggregate; entity type keeps API byte-identical | Fewer methods (adapter does shapes — loses precision); return Prisma types (leaks coupling) |

## Phases (Kanban mapping)

| Phase | Kanban | Deliverables | Impact |
|-------|--------|--------------|--------|
| F0 | Fase 0 baseline/conventions | `docs/hexagonal-conventions.md` (layout, Symbol binding, import rules); eslint boundary rule (`prisma/generated` only in `**/adapters/**` + `src/prisma/**`); normalize generated-import paths in touched files (exclude user.service legacy import); green baseline run | ~3–5 files |
| F1 | Fase 1 livestock pilot | Contract-locking `livestock.service.spec.ts` FIRST; 3 ports + Symbols; `domain/livestock-status.ts` + adapter mapping; `prisma-livestock.repository.ts`; service on ports; module wiring; controller import-line change; verify + optional `/livestocks` e2e | ~8–10 files (4–6 new) |
| F2 | Fase 2 12 CRUDs | Waves: company/module-entity → farm/lot → user → livestock-event/weight-record → task/task-type → machine/machine-usage → livestock-movement. Per wave: contract-locking spec + tests, port(s), adapter, service refactor, wiring, verify. Cross-entity reads use owning module's exported port when already extracted, else narrow capability port (replaced later) | ~60–75 files (12 modules × ~5) |
| F3 | Fase 3 auth | `UserCredentialsRepository` (findByEmail, update) + `RefreshTokenRepository` (create, findActiveWithUser, revoke); contract-lock current behavior first (existing spec = baseline; do NOT improve O(n) scan / 423 payload / hash migration); service on ports; wiring; verify | ~6–8 files |
| F4 | Fase 4 mobile | Explicit composition root in `main.dart` (construct `HttpAuthRepository` → `LoginViewModel` at top, pass via ctor); `domain/repositories/auth_repository.dart` (relocate/re-export interface); keep manual DI; flutter analyze + test green | ~3–5 files |

## Test Strategy

- **strict_tdd=true** (`pnpm --filter backend run test`): tests are written BEFORE each module's refactor — the contract-locking spec IS the first artifact of every module sequence.
- Contract-locking: freeze current behavior (ownership rules, tagNumber uniqueness, date parsing, error statuses/messages, response shapes) with unit tests against mocked ports (plain objects + `jest.fn()`, same pattern as existing `auth.service.spec.ts`).
- Adapters stay thin → covered by existing/optional e2e (`supertest`); unit coverage targets services only.
- Existing tests must stay green across every phase; auth tests migrate from mocking `PrismaService` to mocking the new ports when F3 lands.
- Behavior drift guard: pre-existing bugs stay untouched; refactor must not "improve" logic.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Behavior drift during refactor | Med | Contract-locking tests before each module; byte-identical error/response semantics; never fix pre-existing bugs |
| Cross-entity port granularity wrong | Med | Option A capability ports now; mechanical swap to exported ports at F2; contract identical |
| Enum/type friction at controller boundary | Low | Domain copy with identical member names → import-only change, type-compatible |
| Zero entity tests today | High | strict_tdd contract-locking per module before touching code |
| Auth extraction breaks lockout/migration/rotation | Med | Existing spec is the baseline; add contract tests; no logic improvements |
| Prisma 7 mixed import paths | Low | F0 hygiene; legacy runtime import resolves naturally into adapter at F2 |
| Port/class explosion across 12 CRUDs | Med | Waves with small reversible diffs; per-module commits |

## Rollback Plan

Per-module `git revert` — each extraction is an additive strangler commit (adapter added, module re-pointed, old direct-Prisma path restorable by reverting the wiring commit). No schema/DB migration involved. Mobile: revert `main.dart` composition. Worst case: revert the whole branch; nothing destructs (no deletes until all green).

## Dependencies

- Green baseline: `pnpm --filter backend run test` passes before F0.
- F1 depends on F0 conventions (lint boundary rule).
- F2 Option B depends on company/lot extraction order (wave order guarantees it).
- F4 depends on F1–F3 conventions for mirroring.

## Success Criteria

- [ ] `pnpm --filter backend run test` / `test:e2e` / `lint` / `build` green at every phase end.
- [ ] Zero `src/` files outside `**/adapters/**` + `src/prisma/**` import `prisma/generated` (eslint rule enforced).
- [ ] All 13 entity modules + auth services inject ports; no service imports `PrismaService`.
- [ ] API contract byte-identical: no route/signature/error/response diffs (only import-path changes in controllers).
- [ ] `flutter analyze` + `flutter test` green; explicit composition root in `main.dart`.
