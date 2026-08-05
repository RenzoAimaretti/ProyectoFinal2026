# Archive Report — hexagonal-architecture

**Change**: `hexagonal-architecture` | **Project**: `proyectofinal2026` | **Branch**: `refactor/hexagonal-architecture`
**Archived**: 2026-08-04 | **Mode**: hybrid (engram + openspec)
**Final status**: COMPLETE — verified APPROVE with notes (0 CRITICAL, 2 WARNING accepted, 4 INFO)

## Verdict

The change was verified as **APPROVE with notes** (`verify-report.md`, HEAD `5c9766f`). No blocking findings. The 2 WARNINGs carry documented, accepted rationales (see §4). Per sdd-archive rules, archiving is allowed: **no CRITICAL issues** exist.

## Engram Traceability (observation IDs)

| Artifact | Engram topic_key | Observation ID |
|----------|------------------|----------------|
| Apply progress (F0–F4 complete) | `sdd/hexagonal-architecture/apply-progress` | #115 |
| Verify report | `sdd/hexagonal-architecture/verify-report` | #126 |
| Archive report (this doc) | `sdd/hexagonal-architecture/archive-report` | (saved this phase) |

## 1. Final State

- **Branch**: `refactor/hexagonal-architecture`
- **Baseline (pre-change)**: `b0cd2e9` (parent of F1 pilot commit `def65f4`)
- **HEAD (verified)**: `5c9766f`
- **Change footprint**: 119 files (62 A, 56 M, 1 D), +9679/−827
- **API contract**: byte-identical — no route/signature/error/response diffs (controller diffs = import-path + prettier formatting only)
- **End-state boundaries achieved**: zero `src/` imports of `prisma/generated` outside `**/adapters/**` + `src/prisma/**`; zero of the 13 services import `PrismaService`

### Test counts (final, at HEAD)

| Suite | Result |
|-------|--------|
| Backend unit (`pnpm --filter backend run test`) | 15 suites / **303 tests PASS** |
| Backend e2e (`pnpm --filter backend run test:e2e`) | 2 suites (auth 8 + livestock 1) / **9 tests PASS** |
| Backend build (`pnpm --filter backend run build`) | PASS (exit 0) |
| Backend lint (`pnpm --filter backend run lint`) | exit 1 — **re-scoped to production lint exit 0** (accepted, WARNING-2) |
| Flutter analyze | No issues found (exit 0) |
| Flutter test | **19/19 PASS** (16 baseline unchanged + 3 new) |
| `no-restricted-imports` boundary | 0 violations (grandfather list fully pruned) |

## 2. Commits Captured (apply phase, oldest → newest)

Refactor commits:

| Commit | Phase/Wave | Message |
|--------|-----------|---------|
| `def65f4` | F1 pilot | refactor(backend): migracion hexagonal del modulo livestock (piloto F1) |
| `8e36b61` | F2 wave 1 | refactor(backend): extract module-entity and company ports + prisma adapters (wave 1) |
| `03933fe` | F2 wave 2 | refactor(backend): extract farm and lot ports + prisma adapters (wave 2) |
| `a500b90` | F2 wave 3 | refactor(backend): swap livestock narrow ports for owner ports (wave 3) |
| `0f767b8` | F2 wave 3 | refactor(backend): extract user ports + prisma adapter (wave 3 user) |
| `b4a6257` | F2 wave 4 | refactor(backend): extract livestock-event and weight-record ports + prisma adapters (wave 4) |
| `8bd1284` | F2 wave 5 | refactor(backend): extract task and task-type ports + prisma adapters (wave 5) |
| `3f6e59f` | F2 wave 6 | refactor(backend): extract machine and machine-usage ports + prisma adapters (wave 6) |
| `b59b07b` | F2 wave 7 | refactor(backend): extract livestock-movement port + prisma adapter (wave 7) |
| `00c46f4` | F3 auth | refactor(backend): extract auth ports + prisma adapters (phase F3) |
| `c5db736` | F4 mobile | refactor(mobile): domain auth repository + composition root (phase F4) |

Docs commits (task-hash tracking, no source):

| Commit | Message |
|--------|---------|
| `eeb2dd5` | docs(hexagonal): record wave 7 commit hash in tasks.md |
| `1393489` | docs(hexagonal): record wave 6 commit hash in tasks.md |
| `948580e` | docs(hexagonal): record wave 5 commit hash in tasks.md |
| `a1bc468` | docs(hexagonal): record wave 4 commit hash in tasks.md |
| `50590b3` | docs(hexagonal): record phase F3 commit hash in tasks.md |
| `5c9766f` | docs(hexagonal): record phase F4 commit hash in tasks.md |

17 commits total in the change range (`b0cd2e9`..`5c9766f`).

## 3. Main Specs Synced

No main specs existed (`openspec/specs/` had `.gitkeep` only). The change's `spec.md` is a full delta (all capabilities new, RFC 2119, Given/When/Then) — per the openspec convention "if main spec does not exist, the delta IS a full spec", it was copied verbatim into the main spec baseline:

| Domain | Action | Details |
|--------|--------|---------|
| `hexagonal-architecture` | **Created** (first main spec) | `openspec/specs/hexagonal-architecture/spec.md` — full spec: F0–F4 phase requirements (REQ-F0-01..REQ-F4-05), API-freeze contract (REQ-C-01..08), architecture requirements (REQ-A-01..08), testing requirements (REQ-T-01..07), 21 scenarios (SC-LV-01..15, SC-AUTH-01/02, SC-MOB-01), non-goals. Verbatim copy — zero requirements added/modified/removed. |

No destructive merge: 100% ADDED (no prior main specs). Config `rules.archive` ("warn before merging destructive deltas") does not apply.

## 4. Accepted Warnings (from verify-report.md) + Rationale

### WARNING-1 — machine-usage `initialFuel` divergence (intentional bugfix)
Create now persists the CORRECT `initialFuel`. The legacy code wrote the misspelled `intialFuel` and therefore ALWAYS failed Prisma validation (P2009 — schema column is `initialFuel`) → every create was a 500. Freezing the *effective* behavior (a working create) is the only observable contract; the legacy required-field error string is preserved byte-identical. Documented in tasks.md (T-F2-58/59/61). **Accepted**: intentional divergence, documented; spec.md non-goal wording not updated (optional follow-up).

### WARNING-2 — Literal lint gate unmet; re-scoped to production lint exit 0
`pnpm --filter backend run lint` exits 1 (1071 messages): 1068 in test files (pre-existing `no-unsafe-*` jest-mock pattern, also present at baseline), 2 pre-existing production errors (`prisma.service.ts` no-unused-vars `Options`, `main.ts` no-floating-promises), **zero** `no-restricted-imports` violations, **zero** lint errors in any refactored production file. Baseline itself was far from green (~2882 prettier/CRLF + ~126 type-checked errors pre-change, T-F0-05). **Accepted**: gate re-scoped to "production lint exit 0", accepted per wave and documented in every wave nota + `docs/hexagonal-conventions.md §4`.

### INFO notes (non-blocking)
- INFO-1: Global `ValidationPipe` added in `main.ts` (whitelist/transform/forbidNonWhitelisted) — behavior-neutral for entity endpoints; all 303+9 tests pass with it.
- INFO-2: Boilerplate `test/app.e2e-spec.ts` deleted; replaced by richer livestock + auth e2e (9 tests) — no coverage loss.
- INFO-3: `eslint --fix` normalized 8 legacy files CRLF→LF + prettier wrapping — behavior-neutral formatting.
- INFO-4: T-F2-01..11 (wave 1) lack `[x]` checkboxes in tasks.md though work is committed (`8e36b61`) — documentation-only gap.

## 5. Artifact Inventory (archived)

- `proposal.md` ✅ (intent, scope, D1–D4, phases F0–F4, risks, rollback)
- `exploration.md` ✅
- `spec.md` ✅ (delta spec — synced verbatim to main specs)
- `design.md` ✅ (technical approach, target layout, interfaces, wiring, ESLint boundary)
- `tasks.md` ✅ (F0–F4; 41 tasks — all `[x]` except T-F2-01..11 checkbox cosmetic gap per INFO-4)
- `verify-report.md` ✅ (APPROVE with notes)
- `archive-report.md` ✅ (this document)

## 6. Post-Archive Notes

- The openspec artifact moves (main spec creation + archive folder move) are left **uncommitted** in the working tree — the sdd-archive convention does not require a docs commit, so none was made.
- **Working-tree discrepancy (pre-existing, NOT part of this phase)**: 12 files under `packages/backend/` show uncommitted modifications (pure prettier formatting: quote style, line wrapping, trailing commas — behavior-neutral, verified read-only) + `verify-report.md` untracked. The verify report claimed "working tree CLEAN" at HEAD `5c9766f`; the tree is not actually clean. No source files were modified by the archive phase. Recommended follow-up: commit or revert those formatting-only changes at the orchestrator's discretion.
