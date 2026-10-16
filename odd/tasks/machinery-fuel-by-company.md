# Machinery and fuel by company
Objective: deliver CUU08 / R018–R021 with per-company fuel accounting and a working fleet panel. Branch: `feat/machinery-fuel-by-company` (base `dev` a50a882). Delivery: feature-branch-chain (user selected); forecast ~1,600–2,400 authored diff lines, generated files excluded.
Runner: `pnpm --filter backend test`, focused Jest, Next.js tests/typecheck; isolated database for data-changing checks. Notion task: https://app.notion.com/p/3c15961aad46819a8c0cfbddcb4bd2d6.

## Specs
- S1 — User: "Todo CUU08 (R018–R021)". Check registration of fuel, maintenance, repair, usage, accumulated hours/hectares and maintenance alerts through public interfaces. Source: `doc/specs/maquinaria-combustible/spec.md` and `doc/casos-de-uso/CUU08-registrar-actividades-sobre-maquinaria.md`.
- S2 — User: "Consolidado y desglose"; "Solo ADMIN con membresía". Check cross-company reads include only authorized memberships and non-admin reads stay on active company; reject unauthorized writes with unchanged data.
- S3 — User: "Dos movimientos separados"; "Compras menos consumos"; "Tratarlos como ingresos". Check purchases and consumption separately; balance = purchases minus consumption per company; old COMBUSTIBLE rows remain intact and count as income. Verify historical balance caveat.
- S4 — User: "Operario y administrativos"; "No hay máquinas compartidas". Check permitted role/type combinations and prohibit cross-company machine access with unchanged data.
- S5 — User: "Archivo adjunto". Check attach/retrieve receipt with authorized company and reject malformed/foreign association without writes.
- S6 — User: "Por tipo de máquina"; "ADMIN configura; sin valores por defecto". Check thresholds by type, no alert before configuration and alert when accumulated hours or hectares meets a configured limit; only ADMIN configures.
- S7 — User: "en la tarea de notion describi de manera breve y sumple el trabajo que vamos a realizar y las decisiones que tomamos para que otros devs estem al tanto." Check readable Notion description and status; do not claim implementation complete before checks.
- S8 — User: "inica a trabajar en el worktree con odd". Check branch/worktree isolation, synced ODD file/mirror/todo, tests and coherent work-unit commits without push/PR.

## Tasks
- T1 [S7-S8] Notion handoff and ODD tracking; route inline (no parallel writer; metadata). Status: done; commit: 2d1f8a0; check: Notion content/status fetched, ODD mirror id 1213 read back, diff --check passed.
- T2 [S3-S4] Separate fuel movement semantics, historical compatibility and role/company validation; route inline (dependent on schema and behavior). Status: in_progress; commit: pending; RED/GREEN pending.
- T3 [S5] Receipt attachment with scoped retrieval; route inline (depends on movement model). Status: pending; commit: pending; RED/GREEN pending.
- T4 [S6] Machine types, configurable thresholds and accumulated usage alerts; route inline (depends on current activity model). Status: pending; commit: pending; RED/GREEN pending.
- T5 [S2] Authorized multi-company consolidated reads and membership checks; route inline (depends on prior domain results). Status: pending; commit: pending; RED/GREEN pending.
- T6 [S1-S6] Extend fleet panel with forms, breakdown, activity/maintenance history and alerts; route inline (consumes prior API contracts). Status: pending; commit: pending; RED/GREEN pending.
- T7 [S1-S8] Cross-module functional verification and reviewable delivery summary; route inline plus independent verification if high risk. Status: pending; commit: pending; checks pending.

## Log
- L1 User original request (verbatim): "usando herdr hace un work tree para avanzar con la tarea de notion https://app.notion.com/p/Panel-de-Maquinaria-Control-de-Combustible-por-Firma-3c15961aad46819a8c0cfbddcb4bd2d6?v=4e3c495931864171855483e9d64d9476&source=copy_link"
- L2 User: "planeemos la implementacion y usemos grillme antes de continuar". Decisions from grillme are quoted in S1–S6.
- L3 User: "perfecto inica a trabajar en el worktree con odd, en la tarea de notion describi de manera breve y sumple el trabajo que vamos a realizar y las decisiones que tomamos para que otros devs estem al tanto."
- L4 Notion page updated and fetched: scope, firm permissions, separate movements, receipt attachments, type thresholds, historical caveat. `Estado` set to `En curso`. Worktree clean at a50a882 before this document. Forecast exceeds ~400 lines.
- L5 User chose: "Cadena de PRs en rama de feature (recomendado)". No push or PR authorized; target `dev` follows AGENTS.md. Review slices will be recorded at coherent commit boundaries.
- L6 T1 committed as 2d1f8a0; Notion verified `En curso`. Next T2 models separate movements without rewriting historical records.
