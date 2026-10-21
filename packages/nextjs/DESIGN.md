---
name: Agro Trazabilidad
description: SaaS design system for agro-traceability — from the lot gate to the dashboard.
colors:
  # Primary — mature forest greens
  agro-green: "#3a7d44"
  agro-green-dark: "#2f6b38"
  agro-green-deep: "#1a3323"
  agro-olive: "#6b8f4e"
  agro-forest: "#24402c"
  agro-green-soft: "#e8efe6"
  # Secondary — warm earth accents for data and emphasis
  agro-earth: "#c8754f"
  agro-earth-dark: "#9c4f2f"
  agro-ochre: "#c9a227"
  agro-mustard: "#b9821a"
  agro-wheat: "#cfa43c"
  agro-wheat-dark: "#8a6a12"
  agro-sand: "#d9c9a8"
  # Neutral — dynamic surfaces, ink and borders (resolved per light/dark theme)
  base: "var(--bg-base)"
  base-subtle: "var(--bg-subtle)"
  card: "var(--bg-card)"
  card-hover: "var(--bg-card-hover)"
  ink: "var(--text)"
  ink-soft: "var(--text-secondary)"
  ink-faint: "var(--text-muted)"
  agro-border: "var(--border)"
  agro-border-strong: "var(--border-strong)"
  # Neutral — dark chassis
  agro-sidebar: "#161d28"
  agro-sidebar-deep: "#10161f"
  # Semantic (light values; theme-mapped at runtime)
  success: "var(--semantic-success)"
  success-soft: "var(--semantic-success-soft)"
  warning: "var(--semantic-warning)"
  warning-soft: "var(--semantic-warning-soft)"
  danger: "var(--semantic-danger)"
  danger-soft: "var(--semantic-danger-soft)"
  info: "var(--semantic-info)"
  info-soft: "var(--semantic-info-soft)"
typography:
  display:
    fontFamily: "var(--font-display), Fraunces, Georgia, \"Times New Roman\", serif"
    fontSize: "clamp(2.5rem, 6vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "var(--font-display), Fraunces, Georgia, \"Times New Roman\", serif"
    fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "var(--font-display), Fraunces, Georgia, \"Times New Roman\", serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: "-0.015em"
  body:
    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.22em"
  numeric:
    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif"
    fontWeight: 500
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
rounded:
  sm: "0.5rem"
  lg: "0.5rem"
  xl: "0.75rem"
  card: "1rem"
  card-lg: "1.25rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.agro-green}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.agro-green-dark}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.agro-earth-dark}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-ghost:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card-lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  badge:
    backgroundColor: "{colors.agro-green-soft}"
    textColor: "{colors.agro-green-dark}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  icon-tile:
    backgroundColor: "{colors.agro-green-soft}"
    textColor: "{colors.agro-green-dark}"
    rounded: "{rounded.xl}"
    size: "44px"
---

# Design System: Agro Trazabilidad

## Overview

**Creative North Star: "De la tranquera al tablero"**

Agro Trazabilidad ships **three coexisting visual worlds**, each scoped and deliberate — one product, seen from three distances:

- **Almanaque** — the public landing at `/` (`src/app/page.tsx`), a campaign register printed on ruled paper. Scoped by `.almanac-world`.
- **Operate** — the authenticated management software under `/dashboard/**` (shell in `src/components/ui/layout.tsx`), a surveyor's plate. Scoped by `.operate-world`.
- **Incumbent** — the entry surfaces `/demo`, `/login` and `/onboarding`, the original "Agro-tech premium" system. It is the default resolved by the global `@theme` + `:root` tokens.

The YAML frontmatter above is the **machine-readable base**: the incumbent/shared token primitives (colors, typography, radii, spacing, components). Each world *extends or re-points* those primitives inside its own scope in `src/app/globals.css`; none edits the base. `.impeccable/design.json` is the incumbent machine sidecar (schemaVersion 2) and is left as-is.

The three worlds never leak into each other: a `.almanac-world` rule never styles the app, and a `.operate-world` rule never reaches `/`, `/demo`, `/login` or `/onboarding`.

## World: Almanaque

**Lives at:** `/` — the public landing. Scope class `.almanac-world`, applied at the landing root. Anti-reference: the incumbent gradient-hero + card grid.
**Job:** Persuade. An agronomic campaign almanac: the season is the reading order and the loop *campo → oficina → cliente* is dated ledger entries.

### Palette (`.almanac-world` tokens, light → dark)

| Token | Light | Dark | Job |
|-------|-------|------|-----|
| `--almanac-paper` | `#f1f3f1` | `#0f1512` | cool ruled paper (NOT cream) |
| `--almanac-paper-2` | `#e6eae7` | `#0a0f0c` | colophon / recessed band |
| `--almanac-card` | `#f8faf8` | `#151c17` | plate / sheet paper |
| `--almanac-margin-rule` | `#d2d8d3` | `#263029` | margin rule |
| `--almanac-rule` | `#c1c9c3` | `#35423a` | ledger rule |
| `--almanac-rule-soft` | `#dce1dc` | `#222d26` | soft entry divider |
| `--almanac-ink` | `#16211b` | `#e9eee9` | green-cast near-black ink |
| `--almanac-ink-soft` | `#47534b` | `#a9b5ad` | body copy |
| `--almanac-ink-faint` | `#606c64` | `#8c9890` | labels, captions |
| `--almanac-red` | `#b23a20` | `#e5765c` | red-pencil annotation accent |
| `--almanac-red-strong` | `#8c2c17` | `#f0856b` | red text / focus |
| `--almanac-red-soft` | `#f0dbd4` | `#33201a` | CTA hover wash |
| `--almanac-green` | `#2c5f43` | `#8cc09f` | second accent, deep field green |
| `--almanac-green-strong` | `#234b36` | `#a6d3b6` | green text |
| `--almanac-green-soft` | `#d9e5dd` | `#17281d` | green wash |

### Type

Two voices, both loaded for this world only in `src/app/layout.tsx`:
- `--alm-serif` = `var(--font-almanac-serif)` rendered as **Spectral** — headings and the ledger (`.alm-display`, `.alm-h2`, `.alm-h3`). It overrides the global Fraunces heading rule inside the scope.
- `--alm-sans` = `var(--font-almanac-sans)` rendered as **Archivo** — small-caps UI labels and micro-copy (`.alm-label`, `.alm-body`, `.alm-lead`, `.alm-caption`).
- `.alm-num` sets tabular lining figures; `.alm-faint` is the muted label tone; `.alm-line` is `30px`, the ruled-paper line unit.

### Density & signature move

Density is **ruled and editorial**: the page carries a faint full-height ruling (`.almanac-world` background), and content is built from ledger rows, not cards.
The **signature move** is the campaign register — the *almanac spread*: the loop **campo → oficina → cliente** as dated ledger entries (`.alm-ledger` / `.alm-entry` / `.alm-entry-date`), the primary action set as a register line rather than a floating pill (`.alm-cta`), stamped states (`.alm-stamp--red` / `--green`), red-pencil margin annotations (`.alm-note`), and real field photographs mounted as prints with ruled captions and a tabular data block (`.alm-plate`, `.alm-sheet--margin`, `.alm-datalist`). Motion is the one authored moment: register rules draw in once, left→right (`.alm-draw-rule`, 620ms; `.alm-draw-fade`, 460ms).

## World: Operate

**Lives at:** `/dashboard/**` — the management software (shell + pages). Scope class `.operate-world`, applied at the dashboard shell root. Anti-reference: the incumbent "Agro-tech premium" forest-green gradient + Fraunces (for *this* surface).
**Job:** Operate. The admin lands and must see *what needs their decision* and clear it. This is a console, not a report.

### Palette (`.operate-world` tokens, light → dark)

| Token | Light | Dark | Job |
|-------|-------|------|-----|
| `--op-ground` | `#efeae0` | `#15140f` | bone ground |
| `--op-paper` | `#f8f5ed` | `#1d1b15` | plate / card paper |
| `--op-paper-2` | `#e7e0d0` | `#262320` | ruled band |
| `--op-ink` | `#211f1a` | `#ece6d8` | deep ink line-work |
| `--op-ink-soft` | `#514c42` | `#b3ac9c` | secondary text |
| `--op-ink-faint` | `#6b6459` | `#948c7c` | legend / micro labels |
| `--op-line` / `--op-line-strong` | `#d9d2c1` / `#b7ae97` | `#322f28` / `#474336` | hairlines |
| `--op-signal` | `#a8381d` | `#e5765c` | **the one measurement signal** (survey red) |
| `--op-signal-strong` | `#7f2913` | `#f0856b` | signal text / focus |
| `--op-signal-soft` | `#f0dcd3` | `#35221a` | signal wash |
| `--op-field` | `#33513f` | `#8cc09f` | field green — carries "aprobado" meaning |
| `--op-field-soft` | `#dde6dd` | `#17281d` | field wash |
| `--op-clay` | `#9c5a3c` | `#d99a76` | rejected clay |
| `--op-clay-soft` | `#efe0d6` | `#2f211a` | clay wash |
| `--op-rail` / `--op-rail-2` | `#1c1b16` / `#26241f` | `#100f0c` / `#191712` | the legend bar |

Inside the world the `--color-*` aliases emitted by `@theme` are **re-declared** (custom properties substitute where declared), so the shared `Card`, `Badge`, `StatusBadge`, `DataTable`, `ProgressBar` etc. restyle coherently without editing the incumbent layer. Brand tones are re-pointed to preserve *meaning* — `green*` → field green (aprobado/validado), `earth*` → clay (rechazado), `wheat/ochre/mustard` → signal red (pendiente), `sand/sidebar*` → survey neutrals / rail ink. `.card-surface` and `.edge-glow` lose their green gradients, `.btn-primary` becomes the ink stamp, and `.hero-band` becomes a dark plate.

### Type

`--op-sans` = `var(--font-operate-sans)`, rendered as **Public Sans** (loaded for the world only in `src/app/layout.tsx`). It replaces Fraunces for the whole plate. Numeric values use `.op-num` (tabular lining); legend labels use `.op-label` (uppercase, tracked) and `.op-caption` for non-uppercase micro text.

### Density & signature move

Density is **plate-like and dense**: `.op-canvas` lays a faint 46px survey grid, content sits on ruled `.op-plate` surfaces with `.op-rule` hairlines, and the sidebar rail (`.op-rail`) reads as the map legend. Standard web controls are restyled from the palette but stay standard (`.op-btn`, `.op-input`).
The **signature move** is **pending work keyed to a lot/parcel plan with a status legend**: each queue row (`.op-queue-row`) references its lot (partes) or client (recepciones) and highlights its parcel (`.op-parcel`) on the plan; approving/validating changes the swatch (`.op-swatch`), keyed by `data-status` = `pendiente` (signal) / `aprobado` (field) / `rechazado` (clay) / `vacio` (neutral). See the "Plano de lotes" panel in `src/app/dashboard/page.tsx` and `.op-plan`.

## World: Incumbent

**Lives at:** `/demo`, `/login`, `/onboarding` — and is the default everywhere outside `.almanac-world` / `.operate-world`. This is the original **"Agro-tech premium"** system: forest green + Fraunces + soft depth, driven by the global `@theme` + `:root` tokens in `globals.css` and the incumbent sidecar `.impeccable/design.json`.

### Palette

A disciplined two-family palette: mature forest greens for identity and action, warm earth tones for data and emphasis, resting on a neutral off-white paper with near-black ink.

- **Primary** — Mature Forest Green (`#3a7d44`, identity and primary action), Green Dark (`#2f6b38`, hover/pressed and readable small green text), Deep Seam Green (`#1a3323`, dark bands and gradient tails), Cultivated Olive (`#6b8f4e`, map fills and the hero-gradient midpoint), Forest Shade (`#24402c`, the full-width "who it's for" band), Pale Sprout (`#e8efe6`, soft green washes).
- **Secondary** — Terracotta (`#c8754f`, the single secondary accent: data, map parcels, emphasis), Deep Terracotta (`#9c4f2f`, danger action and readable terracotta text), Golden Wheat (`#cfa43c`, pending and fuel/livestock signals), Harvest Ochre (`#c9a227`, satellite/NDVI parcels), Mustard (`#b9821a`, deeper wheat for overlays), Wheat Dark (`#8a6a12`, small amber-on-light text), Pale Sand (`#d9c9a8`, soft neutral-earth fill).
- **Neutral** — Paper (`var(--bg-base)`, `#f4f5f1` light), Soft Paper (`var(--bg-subtle)`, `#eceee8`), Card (`var(--bg-card)`, `#ffffff`), Card Hover (`var(--bg-card-hover)`, `#fafbf8`), Ink (`var(--text)`, `#151a20`), Ink Soft (`var(--text-secondary)`, `#545f6b`), Ink Faint (`var(--text-muted)`, `#616c78`), Hairline Border (`var(--border)`, `#e3e7e0`), Strong Border (`var(--border-strong)`, `#ced6cb`), Slate Chassis (`#161d28`) / Deep Chassis (`#10161f`) for the dark sidebar and footer.
- **Semantic** — Success, Warning, Danger and Info each expose a solid and a `-soft` translucent wash, used for status only (inside alerts and badges).

**Named rule — The One Green, One Earth Rule.** Brand green carries identity and every primary action; terracotta is the only secondary accent and stays reserved for data and emphasis. No third brand hue is introduced.

### Typography

**Display Font:** Fraunces (`var(--font-display)`, Georgia, Times New Roman fallbacks). **Body Font:** Inter (`var(--font-inter)`, system-ui). **Label/Numeric Font:** Inter with tabular figures — there is no separate mono face.

- **Display** (600, `clamp(2.5rem, 6vw, 3.75rem)`, lh 1.02, ls -0.035em): hero headline and any single dominant number.
- **Headline** (600, `clamp(1.875rem, 3.5vw, 2.5rem)`, lh 1.06): section titles.
- **Title** (600, `1.25rem` lh 1.28, or `clamp(1.625rem, 2.6vw, 2rem)` for page headers): card and module titles.
- **Body** (400, `1rem` lh 1.5; `1.125rem` hero leads): running copy in Ink Soft.
- **Label** (600, `0.75rem`, ls 0.22em, uppercase): kickers and micro-labels.
- **Numeric** (Inter, tabular lining `"tnum" 1, "lnum" 1`): every data figure, KPI delta and axis value.

**Named rule — The Serif Protagonist Rule.** A name or number the user must read at a glance wears Fraunces; everything else is Inter, and every numeric value uses tabular figures.

### Elevation & Depth

Depth is tonal layering plus light, never a flat grey drop. Every raised surface starts from the `.card-surface` treatment — a green-tinted top gradient (card colour mixed 94/6 with brand green, plain card by 40% down) — then a 1px white inset top highlight (the "edge highlight"), then a two-layer ambient shadow. The `.app-canvas` adds fine film grain plus three soft radial glows (green, earth, olive) blended in `soft-light`.

**Shadow vocabulary** (tokens `--shadow-card`, `--shadow-card-hover`, `--shadow-nav`, `--shadow-float`, `--shadow-pop`):
- **Edge highlight** — `inset 0 1px 0 0 rgb(255 255 255 / 0.75)`; 6% white in dark mode.
- **Card** — `var(--edge-highlight), 0 1px 2px 0 rgb(20 26 21 / 0.05), 0 2px 10px -3px rgb(20 26 21 / 0.07)`.
- **Card hover** — `var(--edge-highlight), 0 16px 36px -14px rgb(20 26 21 / 0.18), 0 5px 14px -6px rgb(20 26 21 / 0.08)`.
- **Nav** — `0 1px 2px rgb(20 26 21 / 0.05)`.
- **Float** — `0 28px 64px -24px rgb(20 26 21 / 0.28), 0 10px 24px -10px rgb(20 26 21 / 0.14)` (hero bands, modals, drawers).
- **Pop** — `var(--edge-highlight), 0 2px 4px rgb(20 26 21 / 0.06), 0 18px 40px -16px rgb(20 26 21 / 0.22)`.

**Named rule — The Hairline Depth Rule.** Depth is never a flat grey shadow: every elevated surface pairs a 1px inset top highlight with a two-layer ambient shadow over a subtly green-tinted gradient.

### Shapes

Soft and generous: the smallest radius is `0.5rem` (buttons, inputs, small tiles), cards and panels use `1rem` (`--radius-card`) or `1.25rem` (`--radius-card-lg`), icon tiles use `0.75rem`, and pills, badges and progress bars are full-round. Borders are hairline (`1px` via `--border`), shifting to `--border-strong` on hover. Two signatures break the plain border: the `.edge-glow` 1px gradient frame (green → transparent → wheat) and the `.hero-band` gradient border. Behind map content, `.grid-plot` (a 40px SIG-style grid) and `.paper-page` (notebook rules) reinforce the field/ledger metaphor.

### Components

- **Buttons** — soft `0.5rem` corners; primary is the mature green with a top-lit gradient (`.btn-primary`), hover deepens to green-dark, active nudges down 1px, focus-visible draws a 2px green-70% outline, disabled drops to 50%. Secondary is card + hairline; Danger is Deep Terracotta; Ghost is chrome-less ink-soft. Height 40px, padding `10px 16px`.
- **Chips / badges** — full-round pills, `padding: 4px 10px`, `0.75rem` semibold, with a tone-matched translucent fill and 1px inset ring. Tones: green, earth, wheat, slate; status badges add a 6px leading dot. `StatusBadge` maps pending→wheat, approved→green, rejected→earth, neutral→slate.
- **Cards / containers** — `.card-surface` green-tinted top gradient, `--radius-card-lg` radius, hairline border, resting **Card** shadow lifting to **Card hover**; optional `.edge-glow` frame; internal padding `p-5` (20px) / `p-6` (24px).
- **Inputs / fields** — card background, hairline border, `0.5rem` radius, `10px 12px` padding; focus turns the border brand green with a soft green ring; error switches to terracotta.
- **Navigation** — a rounded Soft Paper pill rail on desktop; the sticky header is transparent at rest and gains the card background, hairline, `backdrop-blur` and nav shadow after scroll. The dashboard rail uses the dark Slate Chassis sidebar.
- **Hero band (signature)** — `.hero-band`: a full-width panel on a `120deg` forest → green → olive `padding-box` gradient, framed by an olive→wheat gradient border, white inset highlight, sparse dot texture and film grain, floating on the **Float** shadow, holding white display type plus an optional protagonist metric. Still used directly by `/demo` (with `borderRadius: 0` for a full-bleed header). The `HeroBand` React component has been removed from `primitives.tsx` (see notes) — compose the class directly.

## Motion & Foundations

Shared across the whole app (`:root` in `globals.css`):
- **Easing** — `--ease-spring` `cubic-bezier(0.22, 1, 0.36, 1)` (entrances/reveals), `--ease-out-soft` `cubic-bezier(0.16, 1, 0.3, 1)` (state changes/fades).
- **Durations** — `--dur-fast` 160ms, `--dur` 240ms, `--dur-slow` 460ms.
- **Grain** — `--grain-url` (feTurbulence, monochrome, very subtle).
- **Radii philosophy** — nothing is square: `0.5rem` minimum, `1rem`–`1.25rem` for surfaces, full-round for pills and progress. Each world keeps this floor even where it changes the language (Almanaque → `2px` print corners; Operate → square plates; Incumbent → the soft default).
- **Reduced motion** — `prefers-reduced-motion: reduce` neutralises decorative keyframes (entrance animations, skeleton shimmer, aurora) while keeping short state transitions. Per-world deltas: the almanac stops `.alm-draw-rule` / `.alm-draw-fade`; operate stops `.op-parcel` / `.op-queue-row` / `.op-nav-link` / `.op-btn` transitions.

Per-world motion deltas:
- **Almanaque** — one authored moment only (rules draw in left→right, `.alm-draw-rule` 620ms; `.alm-draw-fade` 460ms); links underline on a red-pencil rule; the register CTA slides its arrow 6px.
- **Operate** — restrained utility motion: 160–200ms background/border/box-shadow transitions on parcels, queue rows, nav links and buttons; no decorative motion.
- **Incumbent** — spring entrances (`.animate-fade-in-up`, `.animate-drawer-in`, `.stagger-item`), the aurora hero drift, and pulse-soft live states.

## Do's and Don'ts

### Do:
- **Do** pick the world by surface: Almanaque for `/`, Operate for `/dashboard/**`, Incumbent for `/demo`, `/login`, `/onboarding`.
- **Do** set headings, hero copy and protagonist numbers in the surface's display face (Fraunces for incumbent, Spectral for Almanaque, Public Sans for Operate).
- **Do** apply tabular lining figures to every data value (`.text-numeric`, `.alm-num`, `.op-num`).
- **Do** build incumbent elevation as hairline inset + two-layer ambient shadow + green-tinted gradient.
- **Do** keep every corner soft per the radii philosophy; Almanaque's `2px` print corners and Operate's square plates are the documented exceptions, not a licence for arbitrary radii.
- **Do** drive colour from tokens so light and dark mode both resolve; verify text on the lighter end of any gradient.
- **Do** keep the Almanaque's red-pencil accent for annotation only, and Operate's signal red for the one measurement signal.

### Don't:
- **Don't** introduce a third brand hue in the incumbent world — green leads, terracotta supports, and that's the whole palette.
- **Don't** put terracotta (earth) on a primary call to action in the incumbent world; primary actions are green.
- **Don't** use flat grey drop shadows or pure-black ink in the incumbent world; ink stays near-black (`#151a20`).
- **Don't** hardcode hex values in components where a `--color-*` (or world) token exists — it breaks dark mode.
- **Don't** set data figures in a non-tabular face or let columns of numbers go ragged.
- **Don't** rename, reorder or strip the canonical frontmatter token layer; downstream tooling parses it literally.
- **Don't** take the almanac into the app: the campaign-register / ruled-paper world is for the landing — never inside the dashboard.
- **Don't** costume the shell in Operate: the world lends only type, palette, density and one signature move — never restyle the shell, navigation model or controls away from standard web components.
- **Don't** let a world leak: no `.almanac-world` styling in the app, no `.operate-world` styling on `/`, `/demo`, `/login` or `/onboarding`.
- **Don't** point Operate at the incumbent anti-reference (forest-green gradient + Fraunces) or Almanaque at the gradient-hero + card-grid that every SaaS landing ships.
