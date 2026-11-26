# Sprint 4 — Lot profitability & grain indexation

Objective: implement the approved openspec change `openspec/changes/sprint4-rentabilidad-indexacion/` (R030, R031, R032, R033) in backend and web, one work unit at a time.
Branch: `feat/sprint4-rentabilidad-indexacion` (from `origin/dev` 8be5060, local) · Delivery: `ask-on-risk` (user approves every commit, push and PR; PRs target `dev`) · Runners: backend `pnpm --filter backend test` (jest) and `pnpm --filter backend test:e2e`; web `node --test` over `packages/nextjs/test/*.test.mjs`, `pnpm --filter nextjs lint`.

## Specs

The full specification is the openspec change (proposal D1-D28, spec R-FIN-01..17, design, tasks). Each S# below is one work unit and points at it; nothing here adds requirements.

- **S1 — Unit 1: Tarifario + indexación.** openspec `tasks.md` §1 (1.1-1.23); spec R-FIN-01, R-FIN-02, R-FIN-03, R-FIN-04, plus the tariff parts of R-FIN-15 (ADMIN-only, firma from token), R-FIN-16 (Tarifario tab) and R-FIN-17 (tests). User decision on the USD rate (D5), verbatim: "Vamos a dejarlo como oficial venta, pero dejalo antoanto porque esto si puede ser que se tenga que modificar".
- **S2 — Unit 2: Valorización de partes.** openspec `tasks.md` §2; spec R-FIN-05..08.
- **S3 — Unit 3: Gastos manuales.** openspec `tasks.md` §3; spec R-FIN-09..11. User decision (D22), verbatim: "El Admin puede editar y borrar. El supervisor puede sugerir una edicion/borrado que tiene que ser aprobada por el admin".
- **S4 — Unit 4: Calculadora.** openspec `tasks.md` §4; spec R-FIN-12..14, plus R-FIN-15/16/17 for the calculator.

## Tasks

| ID | Specs | Route | Status | Commit / evidence |
|----|-------|-------|--------|-------------------|
| T0 | change docs | inline | done | `cf11f83` docs(openspec) |
| T1 | S1 | delegated writer (sonnet) | done | `4569c53` feat(finance); RED → GREEN per rule; backend 159 suites / 1488 tests + 3 regression pins (tariff 8 suites / 58); web 28/28; verifier: no blockers; native review: declined by the user |
| T2 | S2 | delegated writer (sonnet) | done | `ce89efc` feat(finance); RED → GREEN per rule (2 adapter specs written with their adapters); backend 168 suites / 1556 tests; scoped 33 / 302; verifier: no blockers; e2e passed (user); native review: granted but refused for size (`lens_context_budget_exceeded`); user kept it without native review |
| T3 | S3 | delegated writer (sonnet) | done | `b3b0401` schema + `e1f1752` logic; RED → GREEN per rule (module wiring and 2 regression pins without separate RED); backend 183 suites / 1782 tests; web 61/61; verifier: no blockers; e2e passed (user); native review: granted but refused for size; user kept it without native review |
| T5 | S4 (R-FIN-05 D26 in the calculator detail) | delegated writer (sonnet) | done | `378f748` fix(finance); native assess `medium`, `review_due: false` (`under_budget`); | RED → GREEN per rule (use-case RED by removing the mapping); profitability 10 suites / 128 tests; full jest 193 / 1911; finance e2e 42; web 96/96 |
| T6 | integrate `origin/dev` (L31) | parent (git, schema, generated) + delegated writer (sonnet, Finanzas page + seed) | done, merge uncommitted (awaiting user OK) | backend 205 suites / 1977 tests; finance e2e 42; web 97/97; tsc and lint clean; native review declined by the user |
| T4 | S4 | delegated writer (sonnet) | done | `b80e91c` backend + `72471e1` web and docs; RED → GREEN per rule (e2e, module, seed pin, 2 adapter specs and `canSeeCalculator` without separate RED); backend 193 suites / 1908 tests; finance e2e 42; web 92/92; verifier: no blockers; full e2e passed (user); native review declined by the user |

Route evidence: T1 is delegated through the long-session context backstop (the planning conversation already exceeds ~150k tokens); units are sequential (U2 depends on U1's core and `Tariff`), so there is no parallel-writer reason. Risk T1: item 1 (new migration `Tariff` + enums) and item 2 (new ADMIN-only endpoints) → independent verifier (sonnet) after the writer's own checks. RDD reads `on (decided by global)`.

## Log

- **L1 (2026-11-19) — original request, verbatim:**
  > Quiero empezar el Sprint 4 del proyecto. El sprint que me corresponde es "Calculadora de Rentabilidad por Lote & Indexación a Cereal".
  >
  > Contexto:
  > - Los pendientes de sprints anteriores se cerraron en la rama fix/mobile-catalog-down-sync, en el PR RenzoAimaretti/ProyectoFinal2026#27 contra dev. Si todavía no se mergeó, avisame antes de crear la rama del sprint.
  > - Requisitos del sprint: doc/specs/finanzas-administracion/spec.md, en particular R031 (indexación de tarifas en "kilos de cereal") y R032 (rentabilidad por lote/campaña: ingresos cobrados contra costos operativos por lote). Mirá también R030 (cotización del dólar) y los casos de uso de doc/casos-de-uso/ que apliquen (por ejemplo CUU09, facturación/cobro).
  > - El Sprint 3 dejó la pizarra de cereales (BCR) y el dólar expuestos por la API propia. Su spec (openspec/specs/external-integrations/spec.md) dice que la conversión a kilos de cereal NO se hizo y queda para este sprint.
  > - Existe una rama remota origin/sprint4 que hoy es igual a main y está 14 commits atrás de dev. No sé quién la creó: preguntame antes de usarla o reemplazarla.
  >
  > Qué quiero en esta sesión:
  > 1. Relevá el proyecto sin dar nada por hecho: qué existe hoy en backend, web y móvil para facturación, cobros, costos por lote, tarifas y cotizaciones, y qué falta para R031 y R032.
  > 2. Planificalo conmigo. Traeme las decisiones de producto que hagan falta (por ejemplo: de dónde sale el costo operativo por lote, qué tarifa se indexa, en qué app se muestra la calculadora), de a una pregunta por vez.
  > 3. Recién con el plan acordado, formalizalo como change de openspec, siguiendo el formato de los changes archivados en openspec/changes/archive/.
  > 4. No implementes nada hasta que apruebe el plan.
  >
  > Reglas de trabajo:
  > - La rama del sprint se corta de dev actualizado y tiene que ser distinta de la de los pendientes. Los PR van contra dev.
  > - Consultame antes de cada commit, de cada push y antes de abrir cada PR.
  > - Si delegás exploración o verificación a subagentes, pasales model "sonnet".
  > - Para probar la app Flutter web usá mi Chrome (Claude in Chrome): en el navegador integrado de la app de escritorio, drift falla.
- **L2 (2026-11-23):** PR #27 merged into dev (8be5060). User: "Nono vamos a crear una nueva rama desde dev, hace eso pullea todo lo de dev y crea la rama ewsa de sprint4-rentabilidad-indexacion. Sprint 4 dejala como esta". Branch `feat/sprint4-rentabilidad-indexacion` created; `origin/sprint4` untouched.
- **L3 (2026-11-23):** 28 product decisions agreed grill-me style (D1-D28, recorded in the change proposal). Plan approved: "Aprobado, formalizá". Change committed as `cf11f83` after "Sí, commiteá".
- **L4 (2026-11-23):** User: "Sí, Unidad 1". Before starting, the change was corrected to one hand-written migration per unit (`20261123090000_add_tariffs`, `20261123100000_add_daily_report_valuations`, `20261123110000_add_expenses`), because editing an applied migration breaks Prisma's checksum and units are committed separately.
- **L5 (2026-11-23):** Gotcha found before delegating: `packages/backend/prisma/generated/` (38 files) is tracked in git, so `prisma generate` output is part of each schema change and goes into the same commit.
- **L6 (2026-11-23) — T1 writer result:** tasks 1.1-1.22 implemented (1.23 docs left to the parent). Writer checks: prisma validate OK; prisma generate OK (real diffs only in 10 generated files + new `models/Tariff.ts`; the other generated files are stat-dirty with no content diff); `prisma migrate diff --from-schema <base> --to-schema prisma/schema.prisma --script` equals the hand-written SQL plus 3 CHECKs; backend tsc clean; backend jest 159 suites / 1488 tests pass; eslint 0 errors on new backend files (73 CRLF prettier errors in `app.module.ts` also present in untouched files → pre-existing); web `node --test packages/nextjs/test/*.test.mjs` 28/28; web tsc clean; web eslint 0 errors (1 old warning `client.ts:99`). RED observed before GREEN for every rule. **Not run:** `pnpm --filter backend test:e2e` — denied by the permission classifier for the subagent; surfaced to the user, not retried. Parent spot check: `pnpm --filter backend test -- src/entities/valuation src/entities/tariff` 15 suites / 104 tests pass; web 28/28. Writer notes: `tariff.test-fakes.ts` compiles into `dist` (harmless); `node --test <dir>` fails on Node 24, use the glob. Native `review assess` before commit returned `unassessable` (untracked files); native review applies to the work-unit commit. Risk: item 1 (migration) + item 2 (ADMIN-only endpoints) → independent verifier (sonnet) launched.
- **L7 (2026-11-23) — T1 verification:** independent verifier (sonnet), read-only: no blockers; R-FIN-01..04 and the tariff parts of R-FIN-15/16/17 PASS (additive migration matching the schema plus 3 CHECKs; class-level `@Roles('ADMIN')`; `companyId` only from `req.user.firmaId`; repository scoped by `companyId`; labor type checked against tenant and `deleted`). Its three probes were added by the writer as regression pins (passed first run, no production change): tariff 8 suites / 58 tests, tsc clean. Still unverified: `test:e2e` and running the migration's CHECKs on a disposable Postgres. Change docs: tasks 1.1-1.23 checked; `apply-progress.md` created with the Unit 1 entry.
- **L8 (2026-11-23) — T1 commit:** user: "Sí, commiteá". Committed `4569c53` feat(finance): add tariffs and grain indexation core (70 files; `.atl/` excluded; no attribution trailer per the user's rules). Native assessment `--base-ref cf11f83 --committed-only`: `medium`, `review_due: false` (`under_budget`); re-run with `--escalate-item 1` (migration; endpoints are item 2): `high`, `review_due: true`. Consent envelope relayed; the user chose "Omitir esta vez" → `declined_this_candidate` (no review record; reviewed boundary stays at `cf11f83`).
- **L9 (2026-11-23) — T2 start:** user: "Sí, Unidad 2". Route: delegated writer (sonnet) through the long-session context backstop (the unit adds a migration, ~10 new valuation files, adapters, the `approve` hook and their tests; writing it inline would push the parent past ~150k). Sequential after T1, no parallel-writer reason. Risk T2 (declared in tasks.md §2): item 1 (migration `DailyReportValuation`), item 3 (shared `ApproveDailyReportUseCase`, R017 contract must stay intact), item 4 (idempotent concurrent retries) → independent verifier after the writer's checks. Gotcha for the writer: `DailyReport.hectares` and `hours` are `Float`, so they need an exact conversion into `Dec`.
- **L10 (2026-11-23) — T2 writer result:** tasks 2.1-2.17 implemented (2.18 docs left to the parent; the calculator retry trigger is Unit 4). Writer checks: prisma validate OK; prisma generate OK (real diffs in 10 generated files + new `models/DailyReportValuation.ts`); `prisma migrate diff` from the HEAD schema equals the hand-written SQL plus 3 CHECKs (`DailyReportValuation_price_grain_check`, `_cost_grain_check`, `_amounts_non_negative_check`); backend tsc clean; scoped jest (valuation, tariff, daily-report) 33 suites / 302 tests; full jest 168 suites / 1554 tests (baseline 159 / 1491); eslint no new errors. RED observed per rule, except two adapter specs written together with their adapters (hook adapter, tariff retry adapter). `approve`: hook called after `approveWithStockDeduction`, inside try/catch, returns the same object; every refusal path asserts the hook is not called. Writer deviations: `EntityNotFoundError` in valuation; retry result adds a per-report `failures[]`; `computeValuation` derives ARS from the native amount rounded to 4 decimals; `priceFetchedAt` is the oldest component used; P2002 without metadata is treated as `dailyReportId`; Float → `Dec` via `Dec.parse(String(n)).roundHalfUp(4)`. Parent spot check: the diff stays inside the declared surface; scoped jest re-run 33 suites / 302 tests pass; the `approve` diff read and matches design §2.5. Writer scratch removed by the parent. Risk: items 1, 3, 4 → independent verifier (sonnet) launched.
- **L11 (2026-11-23) — T2 verification:** independent verifier (sonnet), read-only: no blockers; R-FIN-05..08 PASS within Unit 2 scope (additive migration matching the schema plus 3 CHECKs; `approve` hook after the R017 transaction, inside try/catch, same object returned, refusal paths never call it; unique index + P2002 mapping checked against Prisma 7.8 adapter-pg error shape; every reader filters by `companyId`; retry limit 200, summary without limit, `REINTENTO` with valuation date). Advisories: A1 seed re-run broken by the new RESTRICT FKs (change-caused) → fixed inline by the parent (`prisma/seed.ts` deletes `dailyReportValuation` and `tariff` before `dailyReport`/`laborType`; tsc covers the seed); A3 insumos scenario → already asserted (`valuate-daily-report.use-case.spec.ts`, cost = tariff × hours, and the reader port carries no inputs); probe 3 added as regression pins (quoted `"dailyReportId"` → `ALREADY_EXISTS`, quoted `"id"` → rethrow; passed first run, no production change); A2 retry starvation for the company-wide retry and A4 approve latency recorded for Unit 4 in `apply-progress.md`. Final candidate: tsc clean; full jest 168 suites / 1556 tests. Verifier scratch removed by the parent. Still unverified: `test:e2e`, migration CHECKs and real Postgres concurrency, seed run. Change docs: tasks 2.1-2.18 checked; Unit 2 entry added to `apply-progress.md`.
- **L12 (2026-11-23) — e2e:** offered "¿Commiteo la Unidad 2?"; user: "Primero corro e2e". Parent suggested `prisma migrate deploy` then `test:e2e` (both against the `DATABASE_URL` dev DB). User: "Pasaron todos". Parent read-only check `pnpm --filter backend exec prisma migrate status`: 19 migrations, "Database schema is up to date!" (U1 and U2 migrations applied on the local Postgres dev DB without errors). Still unverified: CHECKs rejecting invalid rows on the real DB, real Postgres concurrency, seed run.
- **L13 (2026-11-23) — T2 commit and native review:** user: "Sí, commiteá". Committed `ce89efc` feat(finance): value daily reports on approval with idempotent retries (55 files; `.atl/` excluded; no attribution trailer). Assessment on the unit's own commit (`--base-ref 4569c53 --committed-only`, because U1 was declined and is not re-offered) with `--escalate-item 3` (approve contract; items 1 and 4 in the reason): `high`, `review_due: true`. Consent relayed; user chose "Revisar este cambio" (granted). START with consent granted refused at preflight: `lens_context_budget_exceeded` (no review authority created, nothing to abandon; "split it into a chained sequence of smaller reviewable commits"). Commit size by area: generated client 3235 lines, valuation tests 1076, valuation code 977, approve hook 272, tariff trigger 249, schema/migration/seed 116, docs 93.
- **L14 (2026-11-23):** offered splitting `ce89efc` into three commits to fit the reviewer budget; user: "Dejalo sin revisión". `ce89efc` stays as is, without native review (evidence: independent verifier with no blockers, jest 168 / 1556, e2e passed). Reviewed boundary stays `cf11f83`. Lesson for Units 3 and 4: the tracked generated client alone can exceed the reviewer budget; if native review is wanted, commit the schema, migration and generated client separately from the logic.
- **L15 (2026-11-23) — T3 start:** user: "Sí, Unidad 3". Route: one delegated writer (sonnet) through the long-session context backstop; backend and web are one unit (the web tabs consume the new API), so there is no parallel-writer reason. Risk T3 (declared in tasks.md §3): item 1 (migration `ExpenseCategory`/`Expense`/`ExpenseSuggestion` + partial unique index), item 2 (ADMIN/SUPERVISOR permission matrix), item 4 (one pending suggestion per expense, Serializable transactions) → independent verifier. Scope notes for the writer: loading the seed categories and tariffs is task 4.11 (Unit 4), but the seed reset must delete the new tables before lots (lesson from L11). Commit plan (lesson from L14): two commits, schema + migration + generated client first, then logic + web + docs, so the logic commit can fit the native reviewer budget.
- **L16 (2026-11-23) — T3 writer result:** tasks 3.1-3.18 implemented (3.19 docs left to the parent). Writer checks: prisma validate OK; prisma generate OK (real diffs in 11 generated files + new `models/Expense.ts`, `ExpenseCategory.ts`, `ExpenseSuggestion.ts`); `prisma migrate diff` equals the hand-written SQL except the partial unique index `ExpenseSuggestion_one_pending_per_expense` and 4 CHECKs (`Expense_grain_check`, `Expense_amounts_non_negative_check`, `ExpenseSuggestion_proposed_amount_check`, `ExpenseSuggestion_baja_without_values_check`); backend tsc clean (covers the seed); scoped jest 37 suites / 379 tests; full jest 182 suites / 1771 tests (baseline 168 / 1556); web `node --test` 61/61 (baseline 28); web tsc clean; lint no new errors. RED per rule, except `expense.module.spec`, the category module wiring, and the `client.ts`/`seed-reset` regression pins. Writer deviations: categories use PATCH as in design §2.11 (`input-category` uses PUT); additive `apiPatch` in the web client; extra `ConcurrentModificationError` (409) with an optimistic `updatedAt` guard; category in-use check counts soft-deleted expenses; category outside the tenant → 404, inactive → 400; dates stored as UTC midnight; the expense valuation port propagates `MarketUnavailableError` (503 with the D25 notice); extra DTO fields `pendingSuggestionId` and an `expense` summary with a `deleted` flag; `finance-access` tests rewritten for the new tabs (ADMIN lands on Tarifario, SUPERVISOR on Gastos). Not covered: e2e (`test/finance.e2e-spec.ts` in design §2.13, outside this unit's surface) and a visual run of the tabs. Parent spot check: diff inside the declared surface; seed reset order correct (`expenseSuggestion`, `expense`, `expenseCategory` before `lot`); expense jest re-run 14 suites / 215 tests; web 61/61. Writer scratch removed by the parent. Risk: items 1, 2, 4 → independent verifier (sonnet) launched.
- **L17 (2026-11-23) — T3 verification:** independent verifier (sonnet), read-only: no blockers; R-FIN-09, 10, 11 and the expense parts of 15, 16, 17 PASS (additive migration matching the schema plus the partial index and 4 CHECKs; `RolesGuard` uses `getAllAndOverride`, so method-level `@Roles` wins; role specs drive the real guard over 7 roles; every write path in `runSerializable` with in-transaction re-checks; adapter-pg 7.8 maps 23505 → P2002 and 40001 → P2034, both mapped to 409; `companyId`/`tenantId`/`userId` only from `req.user`; lot checked through the tenant chain). Non-blocking notes: real Postgres behaviour (partial index, CHECKs, SSI) unverified; route verb/path not pinned → the verifier's probe was added by the parent as `expense.routes.spec.ts` (11 tests, passed first run, no production change); `firmaId` undefined would drop the filter (defensive gap, same as Units 1-2, JWT always carries it); any P2002 in `runSerializable` reads as "pending suggestion" (accurate today); partial index and CHECKs are not in `schema.prisma` (possible `migrate dev` drift, as in Units 1-2). Final candidate: full jest 183 suites / 1782 tests. Verifier scratch removed by the parent. Change docs: tasks 3.1-3.19 checked; Unit 3 entry added to `apply-progress.md`. Still unverified: e2e (no finance e2e exists yet), migration on a real DB, real concurrency, seed run, visual check of the new tabs.
- **L18 (2026-11-23) — e2e:** offered "¿Commiteo la Unidad 3 en dos commits?"; user: "Primero corro e2e". Parent suggested `prisma migrate deploy` then `test:e2e`, noting there is no finance e2e yet. User: "Pasaron todos". Parent read-only check `prisma migrate status`: 20 migrations, "Database schema is up to date!" (`add_expenses` with its partial index and CHECKs applied on the local Postgres dev DB without errors).
- **L19 (2026-11-23) — T3 commits and native review:** user: "Sí, commiteá". Committed `b3b0401` feat(finance): add expense, expense category and suggestion schema (17 files: schema, migration, generated client, seed reset) and `e1f1752` feat(finance): add manual lot expenses with supervisor suggestions (74 files: modules, `app.module.ts`, web, docs including the L13/L14 edits); `.atl/` excluded; no attribution trailer. Assessment on the logic commit (`--base-ref b3b0401 --committed-only --escalate-item 2`, item 4 in the reason): `high`, `review_due: true`. Consent relayed with a parent note that the U2 commit (6018 lines) had exceeded the reviewer budget and this one has 8899; user chose "Revisar este cambio" (granted). START refused at preflight again: `lens_context_budget_exceeded` (no authority created). Logic commit size by area: web code 1842, expense domain+app tests 1726, expense domain+app 1389, expense adapters tests 1026, web tests 568, expense adapters 581, expense controllers tests 549, category code 442, category tests 420, expense controllers 253, docs 99. The reviewer budget itself is not reported, so whether a ~2400-line slice fits is unknown.
- **Superseded plan (L15/L18), kept for history:** ask the user before the U3 commits, as two commits (L15): (1) schema + migration + generated client + seed reset, (2) expense-category and expense modules + `app.module.ts` + web + docs (including the L13/L14 edits); `.atl/` excluded. After them, assess the logic commit with `--base-ref <commit 1> --committed-only`, naming items 2 and 4, and the schema commit if wanted. No push or PR without the user's OK; PRs target `dev`.
- **L20 (2026-11-23):** offered splitting `e1f1752` to review the adapters + controllers slice (fit unknown), with the parent recommending to keep it as is; user: "Dejalo sin revisión". `b3b0401` and `e1f1752` stay without native review (evidence: independent verifier with no blockers on permissions, concurrency and isolation; jest 183 / 1782; e2e passed). Reviewed boundary stays `cf11f83`.
- **L21 (2026-11-23) — T4 start:** user: "Sí, Unidad 4". Route: one delegated writer (sonnet) through the long-session context backstop; backend calculator, web calculator, seed and the finance e2e are one unit (the web consumes the new endpoints), so there is no parallel-writer reason. Risk T4 (declared in tasks.md §4): item 2 (ADMIN-only endpoints exposing the firma's financial data; R033 isolation) → independent verifier. Scope: tasks 4.1-4.16 (4.17 docs is the parent's); the finance e2e is task 4.15 (no database, `machine-report.e2e-spec.ts` pattern). A2 from L11 is addressed here: the company-wide retry must not starve on reports whose labor type has no tariff. Native review: every unit commit so far exceeded the reviewer budget (L13, L19); the commit plan is decided at commit time with the user.
- **L22 (2026-11-23) — T4 writer result:**
  - **Scope:** tasks 4.1-4.16 implemented (4.17 docs left to the parent). No schema or migration change.
  - **Writer checks:**
    - backend tsc clean (covers the seed);
    - scoped jest (profitability, valuation, tariff, expense): 48 suites / 516 tests;
    - full jest 193 suites / 1908 tests (baseline 183 / 1782);
    - `finance.e2e-spec.ts` without a database: 42 tests;
    - web `node --test` 92/92 (baseline 61); web tsc clean;
    - lint: no new errors;
    - boundary grep over the five modules' `domain`/`application`: no hits.
  - **Test-first:** RED per rule, except the e2e (black box over existing code), the module spec, the seed pin, two outbound adapter specs and the `canSeeCalculator` tests.
  - **Starvation fix (A2):** in `findApprovedWithoutValuation`, the company-wide branch now adds `laborType: { tariffs: { some: { companyId } } }`. The tariff-save branch is unchanged, and `summarizePendingValuation` still counts everything. The old test that pinned the company-wide `where` was replaced by the starvation test, plus a pin that the tariff-save query has no `laborType` filter.
  - **Seed:** 6 expense categories; 6 example tariffs. Price/cost (basis per ha for the first three, per hour for the rest):
    - Pulverización: 12 kg SOJA / 8000 ARS
    - Fertilización: 9 USD / 6000 ARS
    - Siembra: 30 kg SOJA / 10000 ARS
    - Arranque de equipo: 25000 ARS / 12000 ARS
    - Traslado: 0 ARS / 5 USD
    - Pesaje: 15000 ARS / 0 ARS
  - **Writer deviations:**
    - the pending summary of the calculator is range-bound;
    - the reader returns one row per component and the use case sums per lot;
    - with no filter, the default is the current campaign and `AL_APROBAR`; conflicting filters give 400;
    - fixed UTC-3 offset (no reusable Sprint 3 timezone helper);
    - 404 on the detail for a lot outside the tenant;
    - USD and kg are converted per row and then summed;
    - totals come from the API, not summed by the client;
    - Calculadora is the last tab, and the ADMIN still lands on Tarifario.
  - **Not verified:** query shapes on a real database, the seed run, a visual check of the tab and the drawer.
  - **Parent spot check:**
    - the diff stays inside the declared surface;
    - `packages/mobile` and `packages/web` are untouched;
    - the reader diff was read and matches the report;
    - profitability + valuation jest re-run: 24 suites / 226 tests;
    - finance e2e re-run: 42 tests;
    - web 92/92.
  - **Cleanup and risk:** the parent removed the writer's scratch. Risk: item 2 → independent verifier (sonnet) launched.
- **L23 (2026-11-23) — T4 verification and global checks:**
  - **Verifier:** independent verifier (sonnet), read-only, found no blockers.
  - **Requirements that pass:** R-FIN-12, R-FIN-13, R-FIN-14, the calculator parts of R-FIN-15, R-FIN-16 and R-FIN-17, R-FIN-07(b) and the R-FIN-08 mode. What it confirmed:
    - Real `RolesGuard` with `@Roles('ADMIN')`. The e2e overrides only `JwtAuthGuard`, so roles and routing are real.
    - Every numeric query filters by the session `companyId`. The lot lookup goes through the tenant chain and returns only names and area, which is tenant data.
    - The starvation fix runs `EXISTS` scoped to the same company. The tariff-save branch is unchanged, and the reader has no other caller.
    - The Prisma query shapes are valid against the generated types.
    - The wire contract matches design §2.11.
    - The web sort is stable with nulls last, and the totals row is in a fixed `<tfoot>`.
  - **Non-blocking notes:**
    - Residual starvation from reports that have a tariff but no price.
    - Each row is rounded and then summed.
    - The banner counts all unvalued reports.
    - Neither the seed nor a real database was exercised.
    - Its optional "costo sin ingreso" probe was already covered by `get-lot-profitability-list.use-case.spec.ts:142`, so nothing was added.
  - **Global checks run by the parent:**
    - 5.1: full jest, 193 suites / 1908 tests.
    - 5.3: web `node --test`, 92/92.
    - 5.4: `nextjs lint`, 0 errors and 2 pre-existing warnings.
    - 5.5: the boundary grep over `domain`/`application` of the five modules has no hits.
    - 5.10: `git diff --stat origin/dev -- packages/mobile packages/web` is empty.
    - 5.9 was done per unit (one independent verifier per unit).
  - **Still open:**
    - 5.2: full `test:e2e`, which now includes `finance.e2e-spec.ts`; the user runs it.
    - 5.6: migration on a clean database.
    - 5.7 and 5.8: manual checks with backend and web running.
  - **Change docs:**
    - Tasks 4.1-4.17 and 5.1/5.3/5.4/5.5/5.9/5.10 checked.
    - Unit 4 entry added to `apply-progress.md`. It includes the R032 closure with accrued income (D1) and collections pending (4.17).
- **L24 (2026-11-23) — e2e and U4 commit OK:** offered "¿Commiteo la Unidad 4 en dos commits?"; user: "Primero corro e2e". Parent suggested only `test:e2e` (no new migrations; not the seed, because it wipes the dev demo data). User: "Pasaron todos, commitia". Global check 5.2 checked (full `test:e2e` including `finance.e2e-spec.ts`, user-reported). Commits as planned: (1) backend calculator + starvation fix + seed + finance e2e, (2) web calculator + docs (including L17-L24); `.atl/` excluded.
- **L25 (2026-11-23) — T4 commits and native review:** committed `b80e91c` feat(finance): add lot profitability calculator API (36 files) and `72471e1` feat(finance): add profitability calculator tab (14 files, includes the docs up to L24); `.atl/` excluded; no attribution trailer. Assessment over both (`--base-ref e1f1752 --committed-only --escalate-item 2`): `high`, `review_due: true`. Consent relayed with a parent note that Units 2 and 3 exceeded the reviewer budget; user chose "Omitir esta vez" → `declined_this_candidate`. Reviewed boundary stays `cf11f83`. All four units are committed on the local branch; nothing is pushed.
- **L26 (2026-11-25) — manual checks:** user hit two environment issues while starting the stack (a stale Turbopack cache reporting an invalid `packages/nextjs/package.json` that is valid on disk; the seed failing with ECONNREFUSED because Docker Desktop was not running), then asked: "No entiendo realmente como hacer el test, el sistema ya esta levantado, probalo vos con mi chrome". The parent ran 5.7 and 5.8 in the user's Chrome against the seeded dev database. Both passed (details and figures in `apply-progress.md`, Unit 4). A test user `supervisor.prueba@agrolify.local` (SUPERVISOR) was created from Personal; its generated password lives only in the session scratchpad, not in the repo or the chat. The ADMIN session was signed out to check the SUPERVISOR screens. **Finding:** the lot detail does not carry or show the stale-price flag, its fetch date, the valuation date or the late-valuation mark (`ProfitabilityReportDTO` lacks `priceStale`, `priceFetchedAt`, `valuedAt`, `origin`), while R-FIN-05's D26 scenario requires the calculator detail to show a stale price with its date; the T4 verifier missed it. Checks 5.7 and 5.8 checked; 5.6 still open.
- **L27 (2026-11-25) — T5 start:** user, verbatim: "Corregi eso del precio desactualizado y de paso pasame las credenciales del supervisor para entrar y probar yo". The credentials stay out of the chat (testing rule): the parent points the user to the scratchpad file that holds them. T5 scope: the lot detail of the calculator carries and shows, for each valued report, the stale-price flag with its price fetch date, the valuation date and the late-valuation mark (`origin = REINTENTO`), and for each expense the stale-price flag with its fetch date and valuation date (R-FIN-05 scenario "Precio desactualizado de la cache (D26)"; R-FIN-07 "marcada como valorización tardía"). Route: delegated writer (sonnet) through the long-session context backstop. Risk: none (additive fields on an endpoint added in this sprint whose only consumer is the drawer changed in the same task; read-only) → focused tests and the suite, no independent verifier.
- **Next (superseded by L27):** fix the finding (backend detail DTO + drawer badge, with tests) only with the user's go-ahead, then ask before its commit.
- **L28 (2026-11-25) — T5 result:**
  - **Backend:** the detail gains `priceStale`, `priceFetchedAt`, `valuedAt` and `lateValuation` for each report, and `priceStale`, `priceFetchedAt` and `valuedAt` for each expense. The reader adds them only to the detail selects; its `companyId` filters are unchanged. The list rows are unchanged, which `get-lot-profitability-list.use-case.spec.ts:77` pins with `toEqual`.
  - **Web:** a new `describeValuation` in `format.ts` produces the labels, and the drawer shows them:
    - "Precio desactualizado (cotización del …)" as a badge;
    - "Valorización tardía" as a badge;
    - "Valorizado el …" as secondary text;
    - in "A valor de hoy", a note that the marks describe the original valuation.
  - **Writer checks, all green:**
    - backend tsc;
    - profitability tests, 10 suites / 128;
    - full jest, 193 / 1911;
    - finance e2e, 42;
    - web, 96/96;
    - web tsc;
    - lint, no new errors.
  - **Parent spot check:**
    - the diff stays inside the declared surface (10 files, +270/−2);
    - the reader diff is selects and mapping only;
    - profitability 128/128 and web 96/96 re-run;
    - web tsc clean;
    - the writer's scratch was removed.
  - **Not checked in the browser:** the ADMIN session is signed out, and the user is checking it.
  - **Risk:** none.
- **L29 (2026-11-25) — T5 commit:** user: "Sí, commiteá". Committed `378f748` fix(finance): show stale prices and late valuations in the lot detail (13 files: the fix plus docs L25-L28); `.atl/` excluded; no attribution trailer. Native assessment `--base-ref 72471e1 --committed-only`: `medium`, `review_due: false` (`under_budget`); no high-risk item applies, so no escalation and no review. This L29 entry is uncommitted.
- **L30 (2026-11-25) — push, no PR:**
  - **Push:** user said "Sí, pusheá". Pushed `feat/sprint4-rentabilidad-indexacion` to origin, which created the remote branch tracking origin. The L29 entry and this one stay uncommitted, so they are not in the push.
  - **No PR:** mid-turn the user said, verbatim, "la pr todavia no la hagas, deja el ´ppush nada mas". The PR is not opened.
  - **Dev moved:** `origin/dev` is 23 commits ahead of the branch point `8be5060`.
    - It merged PR #28 `feat/finanzas-multifirma`, which adds `Invoice`, `InvoiceItem`, `Payment`, `Cheque`, `Echeq`, five enums, the `invoice`, `payment`, `cheque` and `echeq` modules, and its own Finanzas page (facturas, cobros, cheques).
    - It also merged PR #29 `PortalCliente`.
    - New migrations on dev: `20261117120000_add_finanzas_multifirma`, `20261118120000_add_echeq_debitado` and `20261119120000_add_payment_usd_rate`. They sort before ours.
  - **Dry-run merge** (`git merge-tree --write-tree origin/dev HEAD`) shows content conflicts in:
    - `packages/backend/prisma/schema.prisma`;
    - the generated client (`enums.ts`, `internal/class.ts`, `internal/prismaNamespace.ts`, `models/Company.ts`), which is regenerable;
    - `packages/nextjs/src/app/dashboard/finanzas/page.tsx`, where both branches rewrote the Finanzas page.
  - No enum or model names collide.
  - **Product note:** dev now models collections (`Payment`), so D1 (accrued income, no collections) can be revisited for R032 "ingresos cobrados".
- **Next (superseded by L31):** before the PR, integrate `origin/dev` into the branch and resolve the conflicts. That includes merging the two Finanzas pages into one tabbed page and regenerating the Prisma client. Do it only with the user's OK. Open the PR against `dev` only when the user asks. 5.6 is still open.
- **L31 (2026-11-26) — integrating dev (T6):**
  - **Request.** User asked "esta mergeado este sprint en dev?" and the parent answered no: 0 of the 8 sprint commits are in `origin/dev`, and there is no PR. The user then said, verbatim: "Entonces mergea este sprint al dev resolvciendo los conflictos sin romper nada".
  - **Route.** Repository rule (AGENTS.md): task work lands in `dev` only through a PR. So `origin/dev` is merged into the branch first, with `git merge --no-commit --no-ff origin/dev`, uncommitted.
  - **Resolved by the parent:**
    - `schema.prisma`: both conflicts were pure additions, so both sides were kept. A shared closing `}` that git had merged was restored, so `ExpenseSuggestion` closes before dev's enums. `prisma validate` passes.
    - The 4 generated client files were taken from ours and then regenerated with `prisma generate`. No conflict markers remain.
  - **Remaining.** `finanzas/page.tsx` was reset to ours. Dev's page, which is ADMIN and SUPERVISOR via `isApproverRole` and matches its `@Roles('ADMIN','SUPERVISOR')` endpoints, becomes a first tab "Facturación y cobros". That keeps Finanzas opening on facturas, as on dev.
  - **Found.** `prisma/seed.ts` resets no dev table (`Invoice`, `Payment`, `Cheque`, `Echeq`), so a re-seed with invoices present would fail on their FKs to `Client`. This was pre-existing on dev and is fixed in the same pass.
  - **Route for the remaining work.** One delegated writer (sonnet), through the context backstop.
- **L32 (2026-11-26) — T6 result:**
  - **Finanzas page (writer).**
    - `facturacion-tab.tsx` holds dev's Finanzas page unchanged. The only things removed are the `DashboardLayout`/`PageHeader` wrapper and its imports; the parent read the diff against dev's original. It keeps dev's `isApproverRole` guard.
    - `access.ts` adds `canSeeBilling` (ADMIN, SUPERVISOR) and puts the `facturacion` tab first. ADMIN sees: facturacion, tarifario, gastos, categorias, sugerencias, calculadora. SUPERVISOR sees: facturacion, gastos, categorias, sugerencias. Other roles still see nothing (fail closed). The default tab is `facturacion`, so Finanzas opens on facturas as on dev.
    - `page.tsx` gains the "Facturación y cobros" tab and a subtitle that covers both areas.
  - **Seed (writer).** The reset now deletes `cheque`, `echeq`, `payment`, `invoiceItem` and `invoice` first. `seed-reset.spec.ts` pins the order: all of them before `client`, `invoiceItem` before `task`. RED was observed by removing the lines.
  - **Parent checks.**
    - No conflict markers anywhere, and nothing is left unmerged.
    - Backend tsc is clean.
    - Full jest: 205 suites / 1977 tests (dev's and ours).
    - Finance e2e without a database: 42.
    - Web `node --test`: 97/97.
    - Web tsc is clean. Web lint: 0 errors, 2 pre-existing warnings.
    - The resolved files are staged. The merge is not committed.
  - **Native review.**
    - A stop hook asked for the preflight mid-merge. It returned `collect` / `intended_untracked_selection_required`, and the parent deferred it until the candidate was complete.
    - On the complete candidate, the assessment returned `high` (`hot_path` in dev's `list-payments.use-case.ts`), 128 files / 20522 lines, `review_due: true`.
    - The consent was relayed with a parent note that the candidate includes all of dev's code. The user chose "Omitir esta vez", giving `declined_this_candidate`.
  - **Still unverified.**
    - Dev's three migrations (`20261117…`, `20261118…`, `20261119…`) are not applied on the user's dev database, which already has ours (`20261123…`). They sort earlier, and `prisma migrate deploy` applies pending ones.
    - A clean-database run (5.6) has not been done.
- **L33 (2026-11-26) — delivery:**
  - **Review consent, second time.** The stop hook asked again for the candidate that only differed by the L32 note. The consent was relayed, and the user chose "Omitir esta vez" again, so the result is `declined_this_candidate`.
  - **Size question.** The user asked: "como es que se agregaron 70 mil lineas, que hiciste?". Measured answer:
    - 69,053 lines come from comparing against `main`, which still lacks everything already on `dev`.
    - The PR against `dev` adds 37,098 lines.
    - The 8 sprint commits add 36,748. By area: generated client 13,021, tests 11,097, code 10,659, docs 1,753, migrations 237.
  - **Go-ahead.** User, verbatim: "bueno hace el commit y hace el merge a dev, main no toques". This authorizes the merge commit on the branch, the push, a PR against `dev` (the repository rule is that `dev` only takes PRs) and merging that PR. `main` is not touched. 5.6 (migration on a clean database) is still open. Push and a PR against `dev` only with the user's OK. L25-L26 entries are uncommitted. The L17-L20 doc edits are uncommitted and ride with them. No push or PR without the user's OK; PRs target `dev`. Still optional for the user: `pnpm --filter backend test:e2e` and applying the migrations on a disposable Postgres. No push or PR without the user's OK; PRs target `dev`.
