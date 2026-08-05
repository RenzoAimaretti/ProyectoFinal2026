# Design: Hexagonal Architecture Migration (Strangler per Module)

**Change**: `hexagonal-architecture` | **Project**: `proyectofinal2026` | **Branch**: `refactor/hexagonal-architecture`
**Inputs**: proposal.md (decisions D1–D4), spec.md (REQ-F0..F4, REQ-A, REQ-C, REQ-T). Consumable by sdd-tasks.

## Technical Approach

Strangler per module, persistence-decoupling only: freeze behavior with contract-locking specs first (strict_tdd, `pnpm --filter backend run test`), then extract port + Symbol token, implement Prisma adapter, refactor service to inject ports, wire module providers. F0 sets conventions + eslint boundary; F1 pilots livestock; F2 extracts 12 CRUD modules in waves; F3 auth; F4 mobile composition root. No pure domain layer yet.

## Architecture Decisions

### D1 — Cross-entity reads (REQ-A-03)
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Narrow capability ports (`companyExists`, `findLotWithFarm`) now; swap to owner's exported port at F2 | Chicken-and-egg until owner module extracts; mechanical swap later, identical contract | **Chosen (pilot)** |
| Reuse exported ports immediately | Blocked (company/lot not extracted yet) | Deferred to F2 |
| One fat aggregate port | Leaks module boundaries | Rejected |

### D2 — `LivestockStatus` enum (REQ-A-05)
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Domain copy + adapter mapping | 4-member copy; controller changes import line only (identical member names → type-compatible) | **Chosen** |
| Keep importing generated enum | Defeats pilot goal: services stay coupled to `prisma/generated` | Rejected |

### D3 — Exceptions (REQ-A-06)
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `@nestjs/common` exceptions in services | HTTP exceptions ARE the frozen contract; pragmatism over purity | **Chosen** |
| Exception-mapping port | Behavior-change risk; defer | Deferred |

### D4 — Port shape (REQ-A-02)
| Option | Tradeoff | Decision |
|--------|----------|----------|
| `LivestockRepositoryPort` with 8 methods returning application-layer `LivestockEntity` | 1:1 with today's Prisma calls; full-row entity keeps API byte-identical | **Chosen** |
| Fewer methods / return Prisma types | Adapter does shapes / leaks coupling | Rejected |

## Target Layout (per module)

```
src/entities/{module}/
  ports/            # interfaces + export const {MODULE}_REPOSITORY = Symbol('...')
  domain/           # enum copies (e.g. livestock-status.ts)
  adapters/outbound/prisma/   # ONLY place importing prisma/generated
  {module}.service.ts         # application layer — injects ports, no PrismaService
  {module}.controller.ts      # import-path-only changes
  {module}.module.ts          # providers: [{ provide: TOKEN, useClass: Adapter }]
```

F3 mirrors this under `src/auth/{ports,adapters/outbound/prisma}/`. F4: `lib/domain/repositories/auth_repository.dart`.

## Data Flow (F1 pilot)

```
HTTP → LivestockController → LivestockService (app layer)
                                  │ injects Symbols via ctor
              ┌───────────────────┼────────────────────┐
   LIVESTOCK_REPOSITORY    COMPANY_LOOKUP          LOT_LOOKUP
              │                    │                     │
   PrismaLivestockRepository PrismaCompanyLookup  PrismaLotLookup   (adapters)
              │                    │                     │
              └────────── PrismaService → PostgreSQL ────┘
```

## Interfaces / Contracts

```ts
// ports/livestock.repository.ts
export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');
export interface LivestockRepositoryPort {
  findAll(): Promise<LivestockEntity[]>;
  findById(id: string): Promise<LivestockEntity | null>;
  findByIdWithLotFarm(id: string): Promise<LivestockEntity | null>; // includes lot.farm
  findByTagNumber(tag: string): Promise<LivestockEntity | null>;
  findByTagNumberExcluding(tag: string, id: string): Promise<LivestockEntity | null>;
  create(data: CreateLivestockData): Promise<LivestockEntity>;
  update(id: string, data: UpdateLivestockData): Promise<LivestockEntity>;
  delete(id: string): Promise<LivestockEntity>;
}
// ports/company-lookup.port.ts
export const COMPANY_LOOKUP = Symbol('COMPANY_LOOKUP');
export interface CompanyLookupPort { companyExists(id: string): Promise<boolean>; }
// ports/lot-lookup.port.ts
export const LOT_LOOKUP = Symbol('LOT_LOOKUP');
export interface LotLookupPort {
  findLotWithFarm(id: string): Promise<{ id: string; farm: { companyId: string } } | null>;
}
// domain/livestock-status.ts — copy with identical member names
export enum LivestockStatus { ACTIVO = 'ACTIVO', VENDIDO = 'VENDIDO', MUERTO = 'MUERTO', ENFERMO = 'ENFERMO' }
```

`LivestockEntity` mirrors today's full Prisma row (all fields, byte-identical). Adapter maps generated enum ↔ domain enum; adapter files named `prisma-{module}.repository.ts`.

## Wiring Pattern (REQ-A-08)

```ts
// livestock.module.ts
providers: [
  { provide: LIVESTOCK_REPOSITORY, useClass: PrismaLivestockRepository },
  { provide: COMPANY_LOOKUP, useClass: PrismaCompanyLookup },
  { provide: LOT_LOOKUP, useClass: PrismaLotLookup },
]
```

## ESLint Boundary (REQ-F0-02, REQ-A-04)

Core rule, zero new deps — in `eslint.config.mjs`:

```js
{ rules: { 'no-restricted-imports': ['error', { patterns: [
  { group: ['**/prisma/generated/**', '@prisma/client'],
    message: 'prisma/generated only in adapters + src/prisma' } ] }] } },
{ files: ['**/adapters/**', 'src/prisma/**'], rules: { 'no-restricted-imports': 'off' } },
```

Alternative considered: `eslint-plugin-import` `no-restricted-paths` zones (adds devDependency) — rejected to keep F0 dependency-free.

## Strangler Sequence (per module; REQ-F1-*, REQ-F2-02)

1. Contract-locking spec + unit tests against mocked ports (strict_tdd; REQ-T-01..03).
2. Port interface + Symbol in `ports/`.
3. Adapter in `adapters/outbound/prisma/`.
4. Service refactor: inject ports (no `PrismaService`, no `prisma/generated`).
5. Module wiring `{ provide: TOKEN, useClass: Adapter }`.
6. Verify: unit + lint + build (+ optional e2e); per-wave commit.

F2 waves (REQ-F2-01): company/module-entity → farm/lot → user → livestock-event/weight-record → task/task-type → machine/machine-usage → livestock-movement. Cross-entity reads use the owner's exported port when extracted, else capability port swapped later (D1; REQ-F2-03).

## F3 — Auth Extraction

`src/auth/ports/`: `USER_CREDENTIALS_REPOSITORY` (`findByEmail`, `update`) and `REFRESH_TOKEN_REPOSITORY` (`create`, `findActiveWithUser`, `revoke`) + Symbols; adapters under `src/auth/adapters/outbound/prisma/`. `auth.service.spec.ts` migrates from mocking `PrismaService` to port mocks (REQ-F3-02). Zero logic change (REQ-F3-03): O(n) refresh scan, 423 payload, argon2 migration, lockout, rotation untouched.

## F4 — Mobile Composition Root

`main.dart`: construct `HttpAuthRepository()` → `LoginViewModel(authRepository: ...)` at the top (REQ-F4-01); `authRepository` becomes a required ctor param (no hidden default); relocate interface to `lib/domain/repositories/auth_repository.dart` with re-export to keep existing imports green (REQ-F4-02); manual DI only (REQ-F4-04); `flutter analyze` + `flutter test` green (REQ-F4-05).

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | service rules on mocked ports (ownership, uniqueness, dates, errors) | plain objects + `jest.fn()` (REQ-T-03) |
| E2E | adapters + frozen API | existing supertest suites; optional `/livestocks` (REQ-F1-10) |
| Mobile | composition root | existing flutter tests, behavior unchanged (REQ-T-07) |

## Migration / Rollout

Per-module reversible commits; rollback = `git revert` of the wiring commit (strangler is additive). No DB/schema migration. Pre-existing bugs stay untouched (`livestock-movement` wiring, `intialFuel`, JWT fallback secret, `user.service.ts` legacy import → resolves into its F2 adapter).

## Open Questions

- [ ] Ship optional `/livestocks` e2e (REQ-F1-10) in F1 or defer to F2?
- [ ] Confirm `LivestockEntity` naming suffix for all 12 F2 modules?
- [ ] Confirm core `no-restricted-imports` (zero-dep) vs adding `eslint-plugin-import` for `no-restricted-paths` precision?
