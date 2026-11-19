# Mobile catalog down-sync

Objective: a real mobile login can operate offline with the backend catalog (tasks, inputs, recipes), never mixes demo or another user's data, and docs reflect it.
Branch: `fix/mobile-catalog-down-sync` (from `origin/dev` 36d828f) · Delivery: `ask-on-risk` · Runners: backend `pnpm --filter backend test` (jest), mobile `flutter test` + `flutter analyze` (Flutter SDK at `C:\Users\Nacho\develop\flutter`).

## Specs

- **S1 — Complete catalog pull.** `GET /catalog/field` also returns the tenant's input categories, inputs, labor-type ↔ input-category links and active recipes (`ACTIVA`) with their items, and every collection excludes `deleted` rows. The mobile app parses and stores all of them, so a real login can create a daily report for an assigned task without `LotWithoutRecipeException` and with backend input ids. Additive contract change: existing fields keep their shape.
- **S2 — Demo seeder only for demo.** `CatalogSeeder` runs only after a demo login, never at app startup and never with a real session.
- **S3 — Snapshot reconciliation.** The pull is authoritative: local catalog rows absent from the snapshot are deleted when no local record references them; tasks absent from the snapshot lose their operator assignments, so they leave the operator's list. Rows still referenced stay (known limitation, documented).
- **S4 — Logout with pending sync.** User decision (L3), verbatim: "Se avisa que hay pendientes y se ofrece "Descartar y salir": borra los pendientes y el catálogo local. Nunca se envían con otro usuario, pero se pueden perder partes." Assumption: logout with zero pending also clears the local catalog and business data, so the next user never inherits the previous tenant's data. User decision (L6): "Filtrar por dueño" — sync handlers only push rows whose `operatorId` is the session user; other users' rows go FAILED (never sent, kept, counted by the logout warning).
- **S5 — Pull robustness.** On 401 the pull refreshes the token once (existing `TokenRefresher`) and retries; the pull also runs when connectivity comes back.
- **S6 — Hexagonal boundary.** `RefreshFieldCatalogUseCase` depends only on domain ports; the import-boundary test catches any `data/` import from `domain/`, at any relative depth.
- **S7 — Docs.** User request (L4), verbatim: "actualiza la doc ya que estamos". Update `openspec/specs/offline-sync-engine/spec.md` with the down-sync requirements, fix the stale "no down-sync" scenario in `openspec/specs/external-integrations/spec.md`, and archive the two finished Sprint 1 changes (`sprint1-flutter-ui-persistencia-local`, `sprint1-polish-operario-tareas`).

## Tasks

| ID | Specs | Route | Status | Commit / evidence |
|----|-------|-------|--------|-------------------|
| T1 | S1 (backend) | inline | done | `94269e0` · RED (TS errors on new fields) → GREEN 6/6 |
| T2 | S1 (mobile), S3, S6 | inline | done | `69714a6` · RED (boundary test caught 2 imports; repo/use case compile errors) → GREEN |
| T3 | S5 | inline | done | `dc4ed11` · RED → GREEN 6/6 |
| T4 | S2, S4 | inline | done | `5958e20` · RED → GREEN 13/13 + owner guard RED → GREEN 9/9; verifier: no blockers |
| T5 | S7 | inline | done | `docs(openspec): document catalog down-sync and archive sprint 1 changes` (same commit as this row) |
| T6 | S1–S5 runtime smoke | inline | pending | |

Route evidence: units are sequential (mobile parsing depends on the T1 contract; T4 builds on T2's repository), so there is no parallel-writer reason; work stays inline. Risk: item 1 (T4 deletes local stored data on logout) and item 2 (T4 session/tenant isolation) → independent verifier (sonnet) after T4. RDD is globally disabled by the user.

Forecast: ~900 authored changed lines.

## Log

- **L1 (2026-11-19, user, verbatim):** "quiero que comencemos a realizar el sprint 4 del proyecto, el sprint que me corresponde que es "Calculadora de Rentabilidad por Lote & Indexación a Cereal" pero antes de eso quiero que cerremos los pendientes que quedaron de los sprints anteriores. Principalmente uno sobre el mobile. Para eso quiero que releves el proyecto, y sin dar nada por hecho realicemos todo lo necesario para dejarlo listo para el sprint 4. Vamos a tener que crear una rama obviamente, diferente a la que sera del sprint 4."
- **L2 (2026-11-19, user):** scope for this branch = "Solo down-sync" (teammates' `odd/tasks` items stay out).
- **L3 (2026-11-19, user):** logout with pending sync = "Avisar y permitir descartar".
- **L4 (2026-11-19, user, verbatim):** "actualiza la doc ya que estamos" → S7 added.
- **L5 (survey evidence):** a partial pull already exists (`add2ddf`, `GET /catalog/field`) but skips inputs/recipes; `main.dart:158` seeds demo data on every startup; logout only clears `Sessions`; the sync handlers push any pending row with the current session token, and the backend takes `operatorId` from the JWT, so another user's pending reports would be attributed to them; `refresh_field_catalog_usecase.dart:2-3` imports `data/` and `test/import_boundary_test.dart` misses it.
- **L6 (2026-11-19, user):** commits need the user's OK first ("Antes de hacer commits consultamelo a mi porfa!!!"); T1/T2 had already been committed locally.
- **L7 (2026-11-19, verifier sonnet):** S1, S2, S3, S5, S6 PASS; S4 PARTIAL: `TokenRefresher` clears the session on refresh failure without wiping data, so a next user could push the previous user's outbox (pre-existing). User chose "Filtrar por dueño" → owner guard in `daily_report_sync_handler.dart` and `machine_usage_sync_handler.dart`. Checked that new rows take `operatorId` from `session.userId` (`dashboard_view.dart:138,280`, `MachineUsageFormViewModel.setOperator`). Known limits: demo rows referenced by local records survive a real pull; an unknown task/machine status is dropped by the parser and therefore pruned.
- **L8 (2026-11-19, checks):** mobile `flutter test` 258/258, `flutter analyze` 0 errors / 0 warnings (46 infos), backend `jest` 144 suites / 1384 tests. T4 and T5 committed with the user's OK. Next: T6 runtime smoke.
