---
version: 1
slug: "src-app-dashboard-page-tsx"
primary_target: "src/app/dashboard/page.tsx"
related_targets: []
---

# Surface brief — admin dashboard `/dashboard` (Agro Trazabilidad)

Scope: **replacement visual world** for the management software shell + the admin home surface. Same product truth; new Operate language.
Visitor mode: **Operate** (the user completes tasks; scanability, consistency and standard affordances outrank expression).
Target: `src/app/dashboard/page.tsx` (+ the shell `src/components/ui/layout.tsx`)

**Job / audience:** the office admin / owner-operator lands and must see *what needs their decision* and clear it.
**Proof to demonstrate:** the field→office→client loop as real, actioned work (approve partes, validate receptions) and the traceability spine (firm → field → lot → input) keyed to the lots.
**Structure (from the critique):** this is a CONSOLE, not a report — the actionable queues lead and are resolved in place. Reduce 6 KPIs to the 4 that matter; the two backlog KPIs + the hero metric deep-link into their queues; a compact "Partes por aprobar" list with inline Approve/Reject; "Recepciones por validar" with inline Validate/Reject; remove the duplicate "Módulos" card; regroup the 9 nav modules into ≤5; honest loading states (skeletons, never a `0` while loading); accessible charts/progress.

## Direction contract
- **THESIS:** The admin area is a surveyor's plate — the operation read as a measured map with a legend — and it refuses the neutral KPI-mosaic every admin dashboard ships. It is a console: what needs a decision leads, and it is actioned where it appears.
- **OWN-WORLD:** A survey palette — deep ink line-work on a bone ground, one measurement-red/field-green signal; the sidebar rail is a legend bar. A workmanlike grotesk + tabular figures; small-caps legend labels; ruled hairlines; **dense plates** (borrowed from high-density module design). The incumbent "Agro-tech premium" (forest-green gradient + Fraunces) is the **anti-reference** for this surface. The world lends ONLY type, palette, density, and one signature move — the shell, navigation model and controls stay standard.
- **STORY:** The admin immediately sees what needs their decision and clears it (approve/reject partes, validate/reject recepciones) without leaving the page; the operation's traceability is legible as a keyed map.
- **FIRST VIEWPORT:** the standard app shell (sidebar + topbar) in the survey palette; the two actionable queues leading with inline actions; a compact lot/parcel panel with a status legend keyed to the queues; the reduced KPI row; charts below.
- **SIGNATURE MOVE:** the pending work **keyed to a parcel/lot plan with a status legend** — each queue row references its lot and highlights it on the plan; approve/validate changes the swatch.
- **FORM:** The assigned grounded direction — cadastral / soil-map plate (index 4 of 7), seed key `92adb000`. Code-led (no image generation).
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scope note
Applies to the dashboard (shell + main page). Other dashboard pages keep their content but inherit the new shell/tokens coherently. The landing (`/`, almanac world) and `/demo` + `/login` + `/onboarding` (incumbent world) MUST NOT break. The backend already supports the actions: `approveDailyReport`, `rejectDailyReport`, `validateReception`, `rejectReception`.
