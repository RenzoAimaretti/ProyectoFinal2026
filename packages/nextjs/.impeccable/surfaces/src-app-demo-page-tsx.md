---
version: 1
slug: "src-app-demo-page-tsx"
primary_target: "src/app/demo/page.tsx"
related_targets: []
---

# Surface brief — /demo como recorrido interactivo de 3 vistas

Scope: **rework** of the public demo `/demo` inside the Operate world. Visual language stays (Carta de Suelos).
Visitor mode: **Persuade** (public conversion instrument) rendered in the **product's own Operate language**.
Target: `src/app/demo/page.tsx` (+ `src/app/demo/demo-scenes.tsx` / `demo-data.ts`)

**Job:** a visitor lives the product's real loop — an operator captures a work part on a phone in the field, it arrives on the admin's PC and gets approved, and the client sees it in their audit panel. Show the product, don't describe it.

## Direction contract
- **THESIS:** the demo is a **guided journey across the three views of one work part** (operario → admin → cliente), not a carousel of static screens; it refuses the "screenshot tour".
- **OWN-WORLD:** the existing Operate world (survey palette, Public Sans, `.op-*` classes, `op-plate` / `op-label` / `op-num` / `op-swatch`). No new world.
- **STORY:** the visitor captures a parte on the phone, sends it, watches it arrive **PENDIENTE** on the admin console, approves it, and sees it reflected in the client's audit view — understanding offline-first capture and firm→lot traceability by doing.
- **FIRST VIEWPORT:** the persistent "Demo — datos de ejemplo" banner + a **view switcher** (Operario · Admin · Cliente) and a **"Recorrido guiado"** control (Paso 1·2·3), with the **Operario phone** already shown.
- **STRUCTURE:**
  - **Vista 1 — Operario (celular, phone frame):** an **interactive phone** with a "Parte diario" form (cliente, campo, lote, labor, fecha, ha, hs, insumos, foto del cuaderno) prefilled from seed data and **editable**; a **"Enviar parte"** action shows the offline → **sincronizado** state and hands the part to the shared demo state as **PENDIENTE**. Completing this advances the guided step.
  - **Vista 2 — Admin (PC, desktop/browser frame):** the **real console components** with example data — the "Mesa de decisiones" with the received part in *Partes por aprobar* and **inline Aprobar/Rechazar** (visual), plus a couple of admin panels (KPIs, a trend chart, the lot plan/`op-plan`). **Approving** flips the part to **APROBADO**. Completing this advances the guided step.
  - **Vista 3 — Cliente (auditoría):** the producer's audit view — their lots (master list), the **approved part as a traceable entry** (lote → labor → insumos → certificado) with the `op-swatch` states and a certification. Shows the part only once approved.
- **GUIDED + FREE:** a "Recorrido guiado" toggle drives the steps and switches views with a one-line hint; the view switcher lets the visitor jump freely at any time. Both share the same state.
- **SHARED STATE:** one demo store (`partes` seeded + the created one, with statuses) so a change in one view is visible in the others.
- **Components reales:** reuse `Card` / `Badge` / `StatusBadge` / `KpiCard` / `ProgressBar` / `StatRow` / `TrendChart` and the `.op-*` vocabulary — the demo must read as the real product.
- **A11y:** the view switcher + guided control are keyboard-operable (`tablist`/buttons proper roles), the phone form has real labeled inputs, the banner and every "datos sintéticos / solo lectura" label stay; nothing relies on colour alone.
- **Copy:** es-AR, operator language; all data synthetic and labeled; no invented claims/customers/metrics.
- **Keep:** the WhatsApp CTA (`@/lib/contact`), the read-only nature (no real API calls), the synthetic labeling.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scope note
Only `src/app/demo/**`. Do NOT touch the dashboard, the landing, `/login`, `/onboarding`, or shared components. The demo performs **no network calls** — everything is local, synthetic, read-only.
