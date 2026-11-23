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
| T1 | S1 | delegated writer (sonnet) | done, uncommitted (awaiting user OK) | RED → GREEN per rule; backend 159 suites / 1488 tests + 3 regression pins (tariff 8 suites / 58); web 28/28; verifier: no blockers |
| T2 | S2 | tbd | pending | — |
| T3 | S3 | tbd | pending | — |
| T4 | S4 | tbd | pending | — |

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
- **Next:** ask the user before the U1 commit (code + generated client + tasks.md + apply-progress.md + this doc; `.atl/` excluded); after the commit, run `gentle-ai review assess --base-ref cf11f83 --committed-only` (RDD is on). → parent spot check → independent verifier (items 1, 2) → ask the user before the U1 commit.
