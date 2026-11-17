# Mi Campo — align the lot-polygon module with the new frontend

Align an already-merged module's surface (design tokens + shared UI primitives) to the
current frontend style without changing any capability, endpoint, or role gate.

Branch: `feat/mi-campo-front-alignment` (cut from `dev` at `9611556`).
Scope: `packages/nextjs` only. No backend change.

## Specs

S1 — User request, verbatim:
> El trabajo de los poligonos para los lotes lo hicimos en una branch que quedo desfasada, usando un front viejo, actualicemos la feature para que se adapte al estilo del front nuevo

S2 — User completion condition, verbatim:
> el frontend del modulo poligonos se corresponde con el estilo de frontend nuevo

S3 — User completion condition, verbatim:
> todas las caracteristicas y endpoints siguen operando de manera correcta sobre el modulo

S4 — The capability set of `packages/nextjs/src/app/dashboard/mi-campo/page.tsx` is frozen as
the operational reading of S3. Every one of these must still work after the change:
load `/farms` + `/lots` and group lots by farm; select the first farm and lot; load-failure
state (a dead end with no retry action; see L11 — this is a pre-existing gap, not something
this change removes); no-farms state; farm selection (resets drawing, selects that farm's first
lot); lot selection including each declared area; create an undelimited lot (trimmed name,
positive declared area, kept even if the refresh fails); begin drawing / edit the existing
exterior ring; tap to add and drag to move vertices; remove one draft vertex; require three
distinct points; cancel without saving; save by PUT and adopt the authoritative returned
polygon and area; warn when the refresh after a write fails; confirm and perform physical
deletion, keeping the lot and showing the server rejection on failure; map imagery with
polygons coloured by derived state, selection highlight, empty-map label, location fallback
warning, four-state legend and undelimited count; the four KPI figures; selected-lot detail
(farm, area, agronomic state, active flag, geometry); no-lots state; the four honest
unsupported-feature states (crops/rotations, NDVI, weather/frost, soil moisture).

S5 — Functional requirements stay those frozen in `odd/tasks/visor-sig-poligonos.md` S1–S14.
This change weakens none of them and re-opens none of them.

S6 — These user-facing strings survive verbatim:
`Marcá al menos tres puntos distintos para guardar.`,
`Todavía no hay ningún lote con el polígono delimitado en este campo.`,
plus the load-error, no-farms, no-lots and irreversible-delete texts already in the page.

S7 — Style contract to adopt, from `packages/nextjs/src/app/globals.css` and
`packages/nextjs/src/components/ui/`:
surfaces `bg-base` / `bg-card` / `card-surface`; text `text-ink` / `text-ink-soft`;
borders `border-agro-border`; shape `rounded-card`; elevation `shadow-card`;
semantic `text-danger` / `bg-danger-soft`; display type via `font-display`, numerics via
`text-numeric`. Controls must be the shared primitives: `Button`, `Badge`, `Card`,
`CardHeader`, `PageHeader`, `Modal`, `KpiCard`, `EmptyState`, `TextField`, `SelectField`,
`ConfirmDialog`, `Alert`/`useToast`. Forbidden: new raw hex colours, bespoke `<input>`,
hand-rolled modals, manual card headings, `window.confirm`, cosmetic inline styles.

S8 — The Leaflet boundary stays imperative. Map init, tile layer, layer groups, event
binding, draggable vertex markers and `divIcon` marker HTML remain Leaflet API calls. Only
app chrome around the map (controls, hints, legend, empty-map overlay, warnings) adopts the
design system. `packages/nextjs/src/lib/lot-map.ts` stays pure and DOM-free because
`packages/nextjs/test/lot-map.test.mjs` runs it in Node.

S9 — Write access stays limited to `ADMIN` and `SUPERVISOR`, both by hiding the controls and
by the guards inside the handlers, as today.

S10 — Endpoints are untouched and keep their payloads: `GET /farms`, `GET /lots`,
`POST /lots {name, area, farmId}`, `PUT /lots/:id {polygon}`, `DELETE /lots/:id`. `LotDTO`
keeps `id, farmId, name, coords, polygon, area, active, state`. Nothing under
`packages/backend` changes.

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T01 | S7, S8 | inline | |
| Map colour single-source: replace the duplicated hex literals in `lib/lot-map.ts` and `lot-map.tsx` with CSS-variable names resolved at runtime in the component; keep the pure helpers DOM-free and their existing test green. | | | |
| T02 | S2, S4, S7, S9 | inline | |
| Page frame and controls: `DashboardLayout` + `PageHeader`, KPI row, farm selector and lot chips as primitives, card headings as `CardHeader`. | | | |
| T03 | S4, S6, S7 | inline | |
| Forms and dialogs: create-lot `<input>`s to `TextField` with reset-on-open and submit state; delete `Modal` to `ConfirmDialog`; `Alert`/`useToast` for the error and warning paths, copy preserved. | | | |
| T04 | S4, S7, S8 | inline | |
| Map chrome: draw/edit/vertex buttons, hints, legend and empty-map overlay on primitives and tokens. | | | |
| T05 | S3, S4, S5, S6, S9, S10 | inline + independent verify | |
| Prove: backend lot suite, nextjs `lot-map` tests, `next build`; structural readback of every S4 capability, every S6 string and every S9 gate against the new source. | | | |

## Log

L1 — User request, verbatim:
> El trabajo de los poligonos para los lotes lo hicimos en una branch que quedo desfasada, usando un front viejo, actualicemos la feature para que se adapte al estilo del front nuevo
>
> Condicion de completitud:
> - el frontend del modulo poligonos se corresponde con el estilo de frontend nuevo
> - todas las caracteristicas y endpoints siguen operando de manera correcta sobre el modulo

L2 — Diagnosis corrected. The premise was stale in a different way than stated:
`feat/lot-polygon-sig` is fully contained in `origin/dev`
(`git rev-list --count origin/dev..feat/lot-polygon-sig` = 0; PRs #11–#20 merged) and
`packages/nextjs/src/app/dashboard/mi-campo/page.tsx` is byte-identical between the branch tip
and `origin/dev`. The stale artefact was the local `dev`: 73 commits behind `origin/dev`,
missing the machinery panel and the newer components. Fast-forwarded `dev` a50a882 -> 9611556.
Consequence: this is not a port, it is a re-style of an integrated module.

L3 — Governing constraint on scope: `odd/tasks/web-visual-identity-v2.md` excludes fully
redesigning non-pilot pages. So this is alignment to the system, not a redesign of the page's
information architecture. Concretely, the farm segmented control and the lot chips keep their
interaction model and become `Button` primitives instead of being turned into a `DataTable`.

L4 — Reference pattern adopted from `app/dashboard/maquinaria/page.tsx` and
`app/dashboard/labores/page.tsx`: separate `loading` from `loadError`, `Alert` with retry,
`EmptyState` when there is no data, and refetch after a successful write. No optimistic
updates, matching the rest of the front.

L5 — Known gaps carried in, not created here: no automated test covers this page's
interactions or its role gates, and `visor-sig-poligonos.md` L25/T11/T12 record that browser
verification of creation, deletion and vertex removal was deferred to owner acceptance.
This change adds no such test; T05 proves by structural readback and reports the limit.

L6 — Route: inline for T01–T04, no writer. The units touch the same two coupled files
(`mi-campo/page.tsx` and `components/ui/lot-map.tsx`), so they are not independent work and
splitting them across writers would have overlapped on the same file.
Evidence so far: `npx tsc --noEmit` in `packages/nextjs` clean; `node --test
test/lot-map.test.mjs` 5/5 with the new token-contract test observed RED (missing export)
then GREEN; `npx next build` exit 0 with `/dashboard/mi-campo` prerendered as static.

L7 — Deliberate deviations from S7, each to avoid a regression rather than to cut a corner:
(1) The draft-vertex remove control stays a native `<button>`: the `Button` primitive accepts
no `aria-*` props, and that control's accessible name carries the vertex coordinates
(`Quitar vértice N (lat, lng)`). Swapping it would trade a design-system gain for an
accessibility loss. It already uses tokens only.
(2) The active lot chip keeps `bg-white` / `text-white/70` for its on-primary dot and area
label: `white` is a base utility, not one of the raw hex literals S7 forbids.
(3) The farm segmented control and the lot chips stay `Button` groups instead of becoming a
`DataTable`, per L3: alignment, not redesign.

L8 — Why the map needs `getComputedStyle` and not `var()`: Leaflet writes colours as SVG
presentation attributes (`path.setAttribute('stroke', ...)`), where a `var(--x)` string is
invalid and would render as no colour. The tokens are therefore resolved once per mount from
the live theme in `components/ui/lot-map.tsx`, while `lib/lot-map.ts` keeps exporting token
*names* only, staying DOM-free for its Node test. Vertex marker HTML is inline CSS on a real
element, so there `var()` is used directly.

L9 — The proof this change does and does not give: typecheck, the unit contract test and a
production build cover compilation, the token contract and the map geometry helpers. They do
not cover map interaction, drawing, deletion or role gating in a browser; that gap predates
this change and is reported, not closed.

L10 — Verification evidence (T05):
- `packages/nextjs`: `npx tsc --noEmit` exit 0. `node --test test/lot-map.test.mjs` 5 passing,
  with the new token-contract test seen RED first.
- `npx next build` exit 0, `/dashboard/mi-campo` prerendered as static content.
- `packages/backend`: `npx jest src/entities/lot` -> 8 suites, 124 tests, 0 failures. The
  backend was not modified; this run pins S10 and S3 against the interface this UI calls.
- Structural readback of `page.tsx`: all 8 frozen strings present (S6); all five endpoints with
  unchanged payloads (S10); the `canDraw` definition plus its three handler guards and the
  `esAdmin` scope switch (S9); and every S4 capability still wired: 4 `KpiCard`, 6
  `EmptyState`, the three-point rule, interior-ring preservation on PUT, adoption of the
  authoritative PUT result, the undelimited count, the regional fallback, the legend over all
  four states and the locality warning.

Commits on `feat/mi-campo-front-alignment`:
- `25c377c` refactor(web): paint the lot map from design tokens
- `c8fe296` refactor(web): align Mi Campo with the shared design system

L11 — Independent verification (`gentle-ai-verify`) reviewed the branch diff because Risk item 2
and item 6 apply. Verdict was BLOCKING on two findings, both resolved:

(1) Theme tokens — a real defect. `useThemeColors` returned `{}` when `document` was absent, so
every lookup was `undefined` and Leaflet would paint its own default colour instead of the state
colour. Fixed by `resolveColorTokens`, which always returns one paintable string per token name
and degrades to a visible fallback (`LOT_COLOR_FALLBACK`) rather than to nothing; the reader is
injected, so the module stays DOM-free and the fallback is pinned by a Node test observed RED
first. The contract test also now covers the selection token. Residual limit, deliberately not
fixed: a later theme change is not re-read, because this view has no theme switch and the
palette does not change mid-session; selection remains distinguishable by stroke weight and
fill opacity even if every token degraded.

(2) Load-failure retry — the verifier established that neither `origin/dev` nor this branch
offers a retry action. S4 was therefore wrong: it described the reference pattern from
`labores`/`maquinaria`, not an existing capability of this module. The spec was corrected
instead of the code, because adding an unrequested capability is outside this change. Recorded
here as a pre-existing follow-up for whoever owns functional polish.

Everything else the verifier attacked came back PASS: role gating (the `canDraw` definition, three
independent handler guards, and controls hidden for other roles), the destructive path
(`ConfirmDialog` cannot be dismissed or re-fired while loading, the lot survives a server
rejection, and the message surfaces inside the open dialog), the data contract (all five calls
match `lot.controller.ts`), the frozen copy, and the absence of raw inputs, raw hex,
`window.confirm` or hand-rolled modals in the module.
