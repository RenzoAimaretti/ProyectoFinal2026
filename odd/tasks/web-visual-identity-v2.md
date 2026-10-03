# Feature: Visual identity v2 — Agro-tech premium

Elevate the Next.js front from "generic green dashboard" to a distinctive,
top-tier product feel (Stripe/Linear/Vercel craft). Direction chosen by the
owner: **Agro-tech premium** (deep forest + near-black ink, warm earth accents,
display serif for headings/big numbers + Inter for UI, real depth, fine grain,
generous radii, restrained luxurious motion).

## Why

The current UI is correct but generic: flat green, white cards, soft shadows,
Inter everywhere, placeholder "AG" logo, bare charts, no focal hierarchy.

## Scope

In scope: `packages/nextjs` — design tokens, typography, elevation, material,
motion, identity (logo/favicon/metadata/login), and the two pilot pages
(Dashboard, Insumos) rebuilt with the new language. All other pages keep
compiling and inherit the foundation automatically.

Out of scope: backend/mobile; new npm dependencies; full per-page redesign of the
remaining modules (later phase).

## Pillars

- A. Typography: display face for headings + protagonist numerals, Inter for UI.
- B. Color/depth: fix broken tokens, semantic tones, layered elevation, coherent dark mode.
- C. Material: grain texture, larger consistent radii, gradient borders on hero/primary KPI.
- D. Identity: real SVG logomark + wordmark, favicon, login branding, metadata.
- E. Data-viz: designed charts for the Dashboard (axes/tooltips/gradients).
- F. Motion: tokens + `prefers-reduced-motion`, spring reveals, count-up, hover lift.
- G. Micro-detail: hairlines, hover/active/focus, selection color, thin scrollbar.
- H. States: designed empty/error/loading for the pilot pages.

## Known bugs to fix in the foundation

- `agro-wheat` is used by `primitives.tsx` but never defined in `@theme` -> the
  "Pendiente/wheat" tone renders colorless.
- `.app-canvas` uses `--agro-sky`/`--agro-green`/`--agro-earth` which do not exist
  (tokens are `--color-agro-*`) -> off-brand fallback colors.
- No `prefers-reduced-motion`.
- `.hero-band` and `charts.tsx` use hardcoded hex -> inconsistent dark mode.

## Tasks

- [ ] F1 [web] Foundation: tokens, typography (display font + scale), elevation,
  grain, radii, semantic tones, motion tokens + reduced-motion, micro-detail, bug fixes.
- [ ] F2 [web] Identity: SVG logomark + wordmark, favicon/icon, login branding, metadata.
- [ ] P1 [web] Dashboard pilot: hero + protagonist KPI numerals + designed charts + states.
- [ ] P2 [web] Insumos pilot: protagonist KPIs/table/detail with the new language + states.
- [ ] V1 Verify: `next build` green; visual consistency across all pages.

## Acceptance

- The app reads as a distinctive product, not a template: display typography,
  real depth, warm/cool contrast, texture, strong focal hierarchy.
- No broken tokens; dark mode coherent; reduced-motion respected.
- Every existing page still compiles and keeps working.

## Delivery

- Large (>400 lines): chained/stacked PRs before any PR. Push/PR = owner's call.

## Progress log

- Phase 1 (foundation + identity) launched; Phase 2 (Dashboard + Insumos pilots) next.
