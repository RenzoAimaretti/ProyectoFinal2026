---
target: packages/nextjs/src/app/dashboard/page.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\proyectos\\ProyectoFinal2026\\packages\\nextjs\\src\\app\\dashboard\\page.tsx"
target_fingerprint: "sha256:bac921a424642512601a9bcfee1c3530dd7fdb18921dd859a71f530ed0c629b3"
target_path: "C:\\proyectos\\ProyectoFinal2026\\packages\\nextjs\\src\\app\\dashboard\\page.tsx"
timestamp: 2026-10-09T23-28-26Z
slug: src-app-dashboard-page-tsx
---
# Critique — Agro Trazabilidad admin dashboard (`packages/nextjs/src/app/dashboard/page.tsx`)

Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent). Browser automation unavailable → source-based review + deterministic CLI scan (no live overlay).

## Design Health Score

Applicable maximum = 40 (Operate surface: heuristics 7 and 10 apply).

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Cold load renders KPI/hero `0` and charts' empty message while data is in flight — the page lies on first paint |
| 2 | Match System / Real World | 3 | Strong domain vocabulary; docked for filler ("Ingresos", "Módulos", "Resumen operativo") |
| 3 | User Control and Freedom | 2 | No date-range/window control on fixed 14d/7d charts; badges look like controls but aren't |
| 4 | Consistency and Standards | 3 | Consistent components; bespoke hero refresh button + three different empty treatments |
| 5 | Error Prevention | 2 | Read-only surface; no bulk/undo surface where it would help |
| 6 | Recognition Rather Than Recall | 3 | Explicit labels, no icon-only nav; but KPI cards are inert — you must recall where the action lives |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, palette, bulk actions, sort/pagination, auto-refresh, or drill-down; one manual "Actualizar" |
| 8 | Aesthetic and Minimalist Design | 2 | Dense: 6 KPIs + 3 charts + 2 progress + table + 2 lists + a duplicate module launcher, all near-equal weight |
| 9 | Error Recovery | 3 | Honest dismissible partial-failure banner; but can't say which sections failed and failed ≠ labeled |
| 10 | Help and Documentation | 1 | No tooltips, contextual help, or hints |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Content-grounded, shell-interchangeable.** The substance is genuinely authored for this product (role-aware hero metric that switches headline/metric/label per role; every figure computed from real data; honest deltas). But the composition is the default admin-analytics template: hero band → 6-KPI row → trend + donut → bars + progress → table + side lists → module launcher. Nothing expresses traceability (firm → field → lot → input), and the dashboard's own headline ("Lo que espera tu decisión") is a decision the surface gives no way to make.

**Deterministic scan (B).** `detect --json "src/app/dashboard/page.tsx" "src/components/ui"` → exit 0, **0 primary findings, 10 advisory** (single rule `design-system-font-size`: literal 10/11/15px off the DESIGN.md 12px label step). All true positives; the pattern is system-wide across dashboard pages (not just the target set).

## Overall Impression

A clean, honest report. Its biggest flaw is a category error: it *reports* decisions instead of *hosting* them. An approver lands on "Partes por aprobar: N" with no list and no link, and must navigate away and re-find the work.

## What's Working

- **Role-aware protagonist metric with real editorial intent** — each role leads with *their* number.
- **Honest, computed data** — no invented metrics; "Primera semana con datos" instead of a fake trend.
- **Accessibility-minded components + resilient fetching** — dot+label status, chart aria-labels, Esc on overlays, `Promise.allSettled` partial-failure handling.

## Priority Issues

- **[P1] Surfaces decisions but removes the ability to make them.** Hero metric and backlog KPIs link nowhere; "Recepciones pendientes" rows have no Validar action. Fix: make the metric + both backlog KPIs deep-link into their queues; add a compact "Partes por aprobar" list with an inline Approve. Command: `/impeccable shape`.
- **[P1] Loading is presented as empty/zero.** KPI/hero render `0` and charts render their *empty* copy during load. Fix: loading/skeleton variants for `KpiCard`/`HeroBand`, and a `loading` branch in the charts before `hasSignal`. Command: `/impeccable harden`.
- **[P2] Decision overload.** 6 KPIs (>4 chunk), 9-item sidebar, duplicate "Módulos" card. Fix: cut KPIs to the 4 that matter, remove the duplicate module card, group nav into ≤5. Command: `/impeccable distill`.
- **[P2] Charts/progress not accessible.** Pointer-only series; `ProgressBar` no `role="progressbar"`; `Donut` no name; inconsistent focus. Command: `/impeccable audit`.
- **[P3] Stock/pending lists don't scale.** No search/sort/pagination; `slice(0,6)` hides backlog silently. Command: `/impeccable polish`.

## Persona Red Flags

- **Alex (power user):** no shortcuts/palette; inert KPIs force sidebar navigation; no bulk approve; charts pointer-only; the duplicate Módulos card wastes prime space.
- **Sam (accessibility):** chart series never reach the a11y tree; `ProgressBar`/`Donut` lack semantics; inconsistent focus-visible; no skip link.
- **Ricardo (owner/admin, project persona):** asks "what needs my decision today?" — gets the count with no queue; wants per-firm/per-client signal (absent); can't tell a real `0` from a failed fetch; no drill-down from aggregate to firm/field/lot despite traceability being "the product".

## Minor Observations

Duplicate Módulos card; hand-rolled hero refresh button; redundant per-row pending badge; silent `slice(0, 6)`; fixed windows labelled like controls; donut mixes % center with count rows; stock table has no `caption`; 11px KPI labels risk wrapping; off-ramp micro font-sizes system-wide.

## Questions to Consider

- What if "Partes por aprobar" were a **queue** with inline Approve, not a number?
- If the job is "what needs my decision," why spend the prime real estate on 6 KPIs and 2 trend charts?
- Does an office admin need "Máquinas activas"/"Labores en curso" on the front page, or is it showing everything it *can* compute?
- Where can an admin drill from an aggregate into a firm, field, or lot? If nowhere, is this a dashboard for a traceability product or any operations product?
