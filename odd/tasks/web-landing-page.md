# Feature: Landing / pre-login page (marketing)

Turn the pre-login page into a striking, professional SaaS landing that explains
the platform's capabilities. Reference style: Albor Agro (hero + benefits +
"for whom" + capability blocks + mobile/offline + FAQ + CTA), but original copy
and our own visual identity. Never copy their text.

## Why

The current landing is minimal (header + hero + 3 cards) and does not explain what
the SaaS does. The owner wants it to sell the product.

## Grounding (real product — from `doc/vision.md` + built modules)

- SaaS B2B multi-tenant + multi-firma (Eliggi / Eliggi Tufoni / Eliggi Néstor).
- Modules: Mi Campo & Mapeo (lotes/polígonos), Producción (tareas del día por
  campo/lote/estado), Partes de trabajo (bandeja de aprobación + foto del
  cuaderno), Insumos por cliente (ingresado vs consumido vs sobrante, stock,
  validación de recepciones), Maquinaria & combustible, Gestión de personal,
  Ganadero de precisión (eventos sanitarios, pesajes, movimientos, RFID a futuro),
  Finanzas multi-firma (módulo en desarrollo).
- App móvil offline-first para operarios (carga en campo, sincroniza al recuperar
  señal).
- Roles: Administrador/dueño, Operativo administrativo, Operario a campo,
  Ingeniero agrónomo, Cliente/productor (auditor con trazabilidad).

## Honesty constraints

- NO fabricated metrics, testimonials, client counts, prices, or integrations.
- Describe capabilities that exist or are explicitly planned in the vision; mark
  Finanzas as "próximamente" if shown.
- No fake contact/signup form; CTAs are "Explorar el panel" (/dashboard) and
  "Iniciar sesión" (/login).

## Tasks

- [ ] L1 [web] Rebuild `src/app/page.tsx` as a full landing (server component,
  reusing the design system + chart kit), original Spanish copy.
- [ ] L2 [web] Sticky nav with anchors + CTAs; hero with headline, subcopy, CTAs
  and a crafted product preview (browser frame with our mini dashboard/map/charts).
- [ ] L3 [web] Sections: value strip, modules grid (icons + benefit copy),
  "para quién es" (roles), "móvil offline-first" with a phone mockup,
  "cómo funciona" 3-step flow, FAQ, final CTA + footer.
- [ ] L4 [web] Extend `src/components/ui/icons.tsx` with the icons needed
  (map/leaf, clipboard, box, tractor, cow, wallet, people, cloud/offline, shield,
  chart, check).
- [ ] V1 Verify: `next build` green; responsive (mobile/desktop).

## Acceptance

- The page reads as a real product landing, not a template, and clearly explains
  the platform's capabilities and value.
- No invented data; CTAs work; mobile responsive.
- Existing exports/components stay backward compatible.

## Delivery

- Large: chained/stacked PRs before any PR. Push/PR = owner's call.

## Progress log

- Launched.
