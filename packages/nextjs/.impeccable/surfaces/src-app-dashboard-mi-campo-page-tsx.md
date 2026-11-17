---
version: 1
slug: "src-app-dashboard-mi-campo-page-tsx"
primary_target: "src/app/dashboard/mi-campo/page.tsx"
related_targets: []
---

# Surface brief — Mi Campo (master–detail rework)

Scope: **layout/IA rework** of an existing surface inside the Operate world. Visual language stays (La Carta de Suelos).
Visitor mode: **Operate**.
Target: `src/app/dashboard/mi-campo/page.tsx`

**Job:** an operator/owner opens Mi Campo to find a farm's lots and understand the selected lot, fast. Today the decorative map leads and the real lot data is buried; selection and detail are split by a memory bridge.

## Direction contract
- **THESIS:** Mi Campo is a **lot workspace**, not a picture — the farm's lots and the selected lot's real data lead, and the illustrative image is demoted to a labelled reference thumbnail inside the detail. It refuses the "big fake hero + KPIs on the side" template.
- **OWN-WORLD:** the existing Operate world (survey palette, Public Sans, `.op-*` classes, `op-plate` / `op-label` / `op-num`). No new world.
- **STORY:** the operator scans the lot list, picks a lot, and reads/understands its data right beside the list — no scroll, no mental bridging.
- **FIRST VIEWPORT (structure):**
  1. **Header** (`.op-plate`): farm name + a **real `<select>`** for the farm (not a wrapping segmented control) + inline totals — surfaced as one **relationship: "superficie declarada vs hectáreas en lotes"** (value + delta).
  2. **Master–detail, two columns:** LEFT = a **searchable + sortable lot list** (rows: name · area ha · active · geometry status; ≥44px rows). RIGHT = the **selected lot detail adjacent** (StatRows in operator language), including a small **labelled reference thumbnail** (the illustrative `SatelliteMap`, clearly "referencia") — never a column-spanning hero.
  3. **KPIs reduced to 2–3** (drop the duplicate `Ubicación`; the two area tiles become one relationship).
  4. **"Próximamente" collapsed** into one compact "En el roadmap" strip (cultivos · NDVI · clima · humedad), or a footer line.
- **Copy (clarify):** remove backend internals from operator-facing text — no `/farms`, `/lots`, "en el backend". Use operator language ("Superficie declarada del establecimiento", "Total de los lotes cargados", "Coordenadas cargadas").
- **States:** loading = **skeletons** of the real layout (not a centered spinner); error = message **with a Retry action**; keep the good teaching empty state.
- **A11y:** correct heading order (an `h2` for sections; no h1→h3 skip); rows/chips ≥44px; the selection indicator must not rely on colour alone; keep `aria-hidden` on the decorative image.
- **Minor fixes:** reset zoom (or remove zoom) when switching farm; respect `prefers-reduced-motion`.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scope note
Only `src/app/dashboard/mi-campo/page.tsx`. Do NOT touch shared components, `globals.css`, the shell, other pages, the landing, `/demo`, `/login`, `/onboarding`. The map stays illustrative (real-geometry rendering is a separate, later decision).
