---
target: packages/nextjs/src/app/page.tsx
total_score: 23
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 2
target_identity: "file:C:\\proyectos\\ProyectoFinal2026\\packages\\nextjs\\src\\app\\page.tsx"
target_fingerprint: "sha256:8a164ed5d8b9fa0f078352ade8eb0f7a57e5140f3e3c5129edf5ad0c593d9f1e"
target_path: "C:\\proyectos\\ProyectoFinal2026\\packages\\nextjs\\src\\app\\page.tsx"
timestamp: 2026-10-09T19-45-49Z
slug: src-app-page-tsx
---
# Critique — Agro Trazabilidad landing (`packages/nextjs/src/app/page.tsx`)

Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent). Browser automation was unavailable, so the review is source-based and the deterministic scan is CLI-only (no live overlay).

## Design Health Score

Applicable maximum = 36 (heuristic #7 scored `n/a` per the Persuade mode-applicability rule).

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sticky-nav morph + scroll progress + states work; nav anchors never show the current section |
| 2 | Match System / Real World | 2 | First text read is "SaaS multi-tenant" — engineering jargon on the highest-visibility real estate |
| 3 | User Control and Freedom | 3 | Global reduced-motion escape hatch works; landing mobile menu has no Escape/tap-outside |
| 4 | Consistency and Standards | 2 | Landing re-declares CTA strings and overrides `h-12`→`h-10`; login/onboarding drop the Fraunces brand face |
| 5 | Error Prevention | 3 | Low-risk surface, few error paths; one misleading CTA label (see P0) |
| 6 | Recognition Rather Than Recall | 3 | Labeled options, no icon-only nav; no current-section indicator; mockup not marked illustrative |
| 7 | Flexibility and Efficiency | n/a | No accelerator concept on a one-page persuade surface |
| 8 | Aesthetic and Minimalist Design | 2 | 10 sections, high polish / low minimalism; effects run on nearly every block |
| 9 | Error Recovery | 3 | Plain, specific login/onboarding errors that preserve the form; login leaks "código 401" |
| 10 | Help and Documentation | 3 | FAQ is task-focused and domain-native; hidden behind accordions, no contact/pricing/demo anywhere |
| **Total** | | **23/36** | **Acceptable (63.9%) — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment: product-authored content, category-interchangeable structure.** The content layer is unmistakably Agro Trazabilidad — real firms (Eliggi, Eliggi Tufoni, Eliggi Néstor), agro vocabulary ("tranquera", "parte diario", "cuaderno", "razón social", "lote"), a module list that matches the app, and an FAQ that answers the genuinely product-specific objections (multi-firm isolation, offline data loss, role-scoped visibility). The skeleton, however, is the default modern B2B SaaS template: aurora hero → browser-chrome preview → feature marquee → 4-up count-up strip → 4-card value grid → 8-card module grid → dark "who it's for" band → phone mockup → 3-step process → FAQ accordion → gradient CTA band → dark footer. Swap the strings and an unrelated vertical could ship it unchanged.

**Deterministic scan (Assessment B).** `impeccable detect --json src` over 4 rules / 8 findings, exit code 2 (findings). Heavily contaminated by name-based matching:
- `bounce-easing` ×5 (`globals.css:366,414,440,456,482`) — **FALSE POSITIVES**. The detector keyed on the token *name* `--ease-spring`, whose value is `cubic-bezier(0.22, 1, 0.36, 1)` (`globals.css:109`) — a monotonic ease-out with both control-point Y at 1, no overshoot. Not fed into synthesis.
- `codex-grid-background` (`globals.css:343`) — arguably **intentional**; `.grid-plot` is the SIG/parcel map backing for `mi-campo`, which the rule's own description permits.
- `side-tab` (`dashboard/produccion/page.tsx:597`) — **out of scope** (dashboard surface, not the pre-SaaS entry).
- `gradient-text` (`page.tsx:673`) — **TRUE POSITIVE**, and it also drives a real dark-mode contrast bug (see P1).

**Visual overlays:** none. Browser automation is unavailable, so no live overlay exists; only deterministic CLI findings are available.

## Overall Impression

The page is genuinely well-built and the copy is its best asset — but it is a beautiful generic SaaS landing wearing agro clothes. The structure asks the copy to carry 100% of the differentiation, and it wastes the two claims that actually differentiate it (multi-firm isolation, offline-first). The single biggest opportunity is to stop being a template and make those two differentiators own the page.

## What's Working

- **Domain-native copy only this product could own.** Real firms, real vocabulary, and product-specific FAQ objections — credibility a generic template cannot fake.
- **The offline-first phone mockup.** It shows actual state and fields ("Sin conexión", "3 partes pendientes", Cliente/Campo/Lote/Labor) and turns an invisible backend promise into a scene the field operator recognizes. The most persuasive element on the page.
- **A disciplined, accessibility-aware design-system foundation.** Semantic tokens, tabular numerals, colorblind-safe charts, dark mode, explicit `:focus-visible`, and honest `prefers-reduced-motion` handling with a global escape hatch.

## Priority Issues

- **[P0] The hero CTA is a broken promise: "Explorar el panel" lands on a login wall.** The hero, nav, mobile menu, final CTA band and footer all send visitors to `/dashboard` labeled "Explorar el panel", and the hero copy says "Explorá el panel con la vista de producto". But `/dashboard` is gated by `useRequireAuth()` and redirects unauthenticated users to `/login?next=/dashboard`. There is no demo/preview mode anywhere. **Why it matters:** the highest-intent moment on a Persuade surface promises a product view and delivers a credential wall. **Fix:** either build a real read-only demo route with seeded data, or relabel to the actual action ("Solicitar acceso" / "Ver demostración") and route to a demo/contact flow. **Command:** `/impeccable clarify` then `/impeccable shape`.
- **[P1] No path to a human and no price.** Only two actions exist, repeated four times: "Explorar el panel" and "Iniciar sesión". No contact, no demo, no WhatsApp/phone/email, no "consultar precios". **Why it matters:** a multi-firm agro buyer decides on trust and cost and won't self-serve into an account they don't have; the page cannot capture a lead. **Fix:** add a low-friction contact/demo CTA in the final band and footer, plus a pricing route. **Command:** `/impeccable shape` or `/impeccable onboard`.
- **[P1] Template structure dilutes the two real differentiators.** Multi-firm isolation and offline-first are delivered as ordinary cards among 8 modules and 4 value props, after a redundant marquee and a self-referential stat strip. **Why it matters:** nothing in the composition makes the differentiators win. **Fix:** drop the marquee, fold the count-up strip into one inline line, and give multi-firm and offline-first authored, unique treatments. **Command:** `/impeccable distill` then `/impeccable shape`.
- **[P2] Cognitive overload: too many equal-weight sections and effects.** 10 sections; the hero alone carries badge + h1 + paragraph + 2 CTAs + 4-item list + a full fake dashboard; aurora, parallax, grain, marquee, count-ups, staggered reveals and edge-glow run almost everywhere. **Fix:** a visual-weight budget — one motion idea per section; remove the marquee; simplify the hero preview. **Command:** `/impeccable quieter` and `/impeccable distill`.
- **[P2] Engineering jargon leads the hero ("SaaS multi-tenant").** The first element read is the badge, and "tenant" recurs in pills, footer and FAQ, translating the real benefit into ops-speak. **Fix:** lead the badge with the plain benefit ("Varias firmas, una plataforma"); confine "multi-tenant" to one FAQ answer. **Command:** `/impeccable clarify`.

## Persona Red Flags

- **Jordan (first-timer):** first text is "SaaS multi-tenant" — bounces before the h1; two near-equal buttons with no "crear cuenta" path; following "Explorar el panel" yields a login form with no signup, demo credentials, or forgot-password; reassurance is collapsed in the FAQ; no visible contact.
- **Riley (stress-tester):** "Explorar el panel" silently fails its promise (`/dashboard` → `/login`); the stat "Módulos en producción 7" and the FAQ say 7 but the footer column lists 4; "5 Roles operativos" conflicts with `nav.ts` (6 roles) and the 6-card roles grid; `ProductPreview` is not marked illustrative so screen readers announce fake KPIs and "En línea" as live; the embedded `TrendChart` has an `onPointerMove` tooltip inside a static illustration.
- **Casey (mobile):** landing mobile menu closes only via its own toggle (no Escape/tap-outside, unlike the dashboard drawer); menu button is `h-10 w-10` (40px, below the 44px floor); heavy motion/SVG on a product whose buyers are on slow field connections.

## Minor Observations

- `login`/`onboarding` headings use Inter bold instead of `font-display` Fraunces — the serif brand voice disappears on the screens right after the landing.
- `PRIMARY_CTA`/`SECONDARY_CTA` are raw class strings later overridden with `+ " h-10 px-5"` — a specificity hack the shared `Button` avoids.
- Firm names hardcoded in both `page.tsx` and `login/page.tsx` — drift risk.
- Nav anchors cover only 4 sections; `#roles` and `#faq` are unreachable from the nav.
- FAQ split arbitrarily by `slice(0,3)`/`slice(3)` with no grouping rationale.
- "Volver arriba" links to `#producto` (the hero), not the true top.
- No `openGraph.images`/`url` or Twitter card — social shares render without a preview image.
- Gradient-clipped h1 span reduces contrast on the lighter end against the light base.
- The marquee pauses only on hover; no explicit pause control.

## Questions to Consider

- If multi-firm isolation and offline-first are the differentiators, why do they get the same card treatment as every module?
- Is "Explorar el panel" meant to be a demo? If yes, where is it; if no, why does the hero promise "la vista de producto"?
- An agro B2B buyer can't transact without a human. What is the intended conversion — self-serve signup, demo request, or a call — and does the page support any of them?
- Does a landing for field-work product need this much motion and this many sections?
