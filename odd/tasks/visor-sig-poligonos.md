# ODD — visor-sig-poligonos

> Organic Driven Development feature document.
> Engram mirror: `odd/visor-sig-poligonos/tasks`
> Branch: `feat/lot-polygon-sig`, cut from `dev` = `a50a882` (in sync with `origin/dev`).

## Objective

Give a lot a real, validated, geo-referenced polygon, expose it on the `/lots`
contract, and let a user draw it on a real map in `/dashboard/mi-campo` — so the
viewer stops being a declared mock with `coords` as free text.

## Problem

`Lot.coords` is `String?` and holds **display text**, not data: the seed writes
`"33° 23' S · 62° 18' O"` (`packages/backend/prisma/seed.ts:243-262`). It cannot be
parsed into a ring, so **no backfill from `coords` into a polygon is possible** —
an earlier draft of this plan claimed one and that claim is withdrawn here.

The viewer already exists as an honest mock:
`packages/nextjs/src/app/dashboard/mi-campo/page.tsx` loads `/farms` and `/lots`
for real, but draws a hardcoded SVG with six decorative polygons
(`src/components/ui/charts.tsx:778-809`), fakes zoom with `transform: scale()`
clamped to 1..2.5, and labels itself `"Vista de referencia · no representa la
geometría real"`. It reads `sel.coords` only to print
`"Disponible en el backend"` (`mi-campo/page.tsx:304`).

Also, `coords` is **required** on create today
(`application/use-cases/create-lot.use-case.ts:17`), but CUU02 states that creating
a lot and delimiting it are separate moments (S2).

## Specs

Requirement text below is quoted verbatim from the repository's source-of-truth
documents. `S#` are frozen: a task may only be reopened by appending the change to
`## Log` and rewriting the affected `S#`.

- **S1 — R001, `doc/specs/micampo-mapeo-sig/spec.md`**
  > El sistema DEBE permitir delimitar polígonos geo-referenciados de lotes para facilitar la gestión territorial y la asignación de tareas a campo.
  
  Its scenario, verbatim:
  > - GIVEN un usuario contratista o productor con acceso al módulo Mi Campo
  > - WHEN delimita un polígono geo-referenciado sobre un lote
  > - THEN el sistema almacena el polígono y lo asocia al lote para su gestión

- **S2 — CUU02, `doc/casos-de-uso/CUU02-delimitar-poligono-lote.md`**
  > Se crea un nuevo lote o se ajusta la delimitación de uno existente.
  
  > El lote queda delimitado y disponible para asignación de tareas (R001).
  
  > El polígono debe ser geo-referenciado (R001).
  
  Consequence: creating a lot and delimiting it are distinct moments, so a lot may
  exist without a polygon and **neither `coords` nor `polygon` is required on create**.

- **S3 — the viewer, `doc/vision.md:86`**
  > Visor de mapa interactivo con polígonos de lotes diferenciados por color según estado (libre, sembrado, aplicado, cosechado).

- **S4 — Persistence (user decision, quoted)**: `GeoJSON en columna Json (recomendado)`.
  No PostGIS: `docker-compose.yml` runs `postgres:16-alpine` and is not to be
  changed. Area is computed in the domain. `coords` is **deprecated, never
  deleted**: `packages/mobile` persists it as a drift column.

- **S5 — Lot state (user decision, quoted)**: `Derivado del historial`. Not
  persisted; returned as an API projection.

- **S6 — Labour classification (user decision, quoted)**: `LaborType.kind + refuerzo con Recipe (recomendado)`.
  `LaborTypeCategory` is rejected as the classifier: its members are **input**
  categories (`Semilla, Fertilizante, Herbicida, Insecticida, Fungicida,
  Coadyuvante, Inoculante, Otro` — `packages/backend/prisma/input-category-defaults.ts`),
  `Cosecha` does not exist there and cannot, it is multi-valued by design, and the
  seed creates **zero** rows (`grep -c laborTypeCategor prisma/seed.ts` = 0).

- **S7 — Scope (user decision, quoted)**: `Visor + captura por dibujo`. Import of
  GeoJSON/KML is out.

- **S8 — Sequencing (user decision, quoted)**: `Modelo geoespacial primero`. One
  schema-touching branch at a time, because the generated Prisma client is tracked
  in Git (`packages/backend/prisma/generated/**`) and parallel schema branches
  always collide there.

- **S9 — Polygon validity rules (authored here, frozen as the validator contract).**
  A stored polygon is a GeoJSON `Polygon` object. Rejected with `InvalidInputError`
  carrying the exact message shown, and evaluated in this order, because the first
  failing rule owns the message:
  1. not an object, or `type !== "Polygon"` → `polygon must be a GeoJSON Polygon`
  2. `coordinates` not a non-empty array of arrays → `polygon coordinates must be an array of linear rings`
  3. a position that is not `[number, number]`, including a non-finite member → `polygon position must be a [longitude, latitude] pair`
  4. longitude outside `[-180, 180]` → `polygon longitude must be between -180 and 180`
  5. latitude outside `[-90, 90]` → `polygon latitude must be between -90 and 90`
  6. fewer than 3 distinct positions → `polygon ring must contain at least 3 distinct positions`
  7. a position repeated consecutively, which is a zero-length edge → `polygon ring must not repeat a position consecutively`
  8. ring not closed → `polygon ring must be closed: the first and last position must match`
  9. any contact between non-adjacent edges: a proper crossing, an endpoint on the
     other edge, or a collinear overlap → `polygon ring must not self-intersect`

  Rules 7 and 9 are why this list is not shorter: a zero-length edge is adjacent to
  both edges it meets, so the self-intersection test can never see it, and a contact
  test that only counted proper crossings let a pinched ring through. Both gaps were
  found by independent verification and are now regression-tested.

  **Accepted limitation, carried as debt in T08:** each ring is validated on its own,
  so a hole that touches the exterior ring at a vertex or an edge is accepted. GeoJSON
  requires a hole to lie inside the exterior ring without crossing it.

- **S10 — Non-negotiable constraints.**
  - The domain layer must not import NestJS, Prisma, or generated Prisma models;
    Prisma belongs only in `adapters/outbound/**`. The module already proves this
    with a purity test (`application/use-cases/lot.use-cases.spec.ts:47-69`), whose
    explicit file list must be extended by any new domain file.
  - Migrations are additive and must not rewrite existing data.
  - No consumer contract may break: `/lots` is read by `packages/nextjs`
    (`src/api/client.ts:310,500,526`) and its payload is persisted by the mobile
    drift database (`packages/mobile/lib/data/services/app_database.g.dart:1594+`,
    `coords String?`). New fields are additive; `coords` keeps its type.
  - Errors and identifiers in English; Spanish domain vocabulary where the schema
    already uses it.

- **S11 — Lot state derivation (authored here, frozen as the derivation contract).**
  `LotState` is one of `libre`, `sembrado`, `aplicado`, `cosechado`, spelled exactly
  as S3 spells them. It is **never stored**: `GET /lots` and `GET /lots/:id` return it
  as a projection, so it cannot drift away from the history that produces it.

  Each event proposes a state:
  - kind `SIEMBRA` → `sembrado`
  - kind `PULVERIZACION` or `FERTILIZACION` → `aplicado`
  - kind `COSECHA` → `cosechado`
  - kind `OTRO` → **no event at all**, it changes nothing. An unclassified catalogue
    therefore leaves every lot `libre`, which is honest rather than a guess.
  - an `ACTIVA` recipe for the lot → `aplicado` (S6's reinforcement)

  What counts as an event, and what date it carries:
  - a daily report whose status is **not** `RECHAZADO`, dated by `date`; a rejected
    report describes work that did not happen
  - a task with status `FINALIZADA` **and** a `finishedAt`, dated by `finishedAt`; a
    pending task is a plan, not history
  - an `ACTIVA` recipe, dated by `date`

  Resolution: **the most recent event wins**, because that is what the lot looks like
  now — a sown lot that is later sprayed reads `aplicado`, and a lot sown again after a
  harvest reads `sembrado`. With no events the state is `libre`. Events that share a
  timestamp are broken by seasonal order — `cosechado` > `aplicado` > `sembrado` — so
  the answer never depends on the order the rows came back from the database.

- **S12 — Drawing permission decision (user response, quoted verbatim):**
  > Solo ADMIN y SUPERVISOR por ahora

  This is a deliberate first-increment exception to S1's producer/contractor scenario,
  not a claim that those roles can complete CUU02. Leave the existing `PUT /lots/:id`
  guard intact and hide write controls for read-only roles; revisit authorization and
  ownership checks before granting those roles write access.

- **S13 — Lot and vertex controls (user request, quoted verbatim):**
  > Nos faltan las opciones para:
  > - agregar/quitar lotes -> quitar debe validar que no haya trabajos asociados activos o no
  > - quitar vertices de un lote

- **S14 — Removal policy (user choice, quoted verbatim):**
  > Borrarlo físicamente solo si no tiene ninguna relación

  Apply S12's existing ADMIN/SUPERVISOR write restriction to these controls. For
  deletion, `Task` counts regardless of its status or `deleted` flag; the other
  direct Lot references also prevent a physical delete. This does not authorize
  deleting related records or running a seed/reset against the development DB.

## Tasks

- [x] **T01 — `Lot.polygon` + additive migration** (S2, S4, S9-partial, S10)
  - Route: inline (single schema unit; requires the local database).
  - Migration `20261012153549_add_lot_polygon`, body exactly:
    `ALTER TABLE "Lot" ADD COLUMN     "polygon" JSONB;` — additive, nullable, no
    data rewrite, and **no backfill** (impossible: `coords` is DMS display text).
  - Evidence: `prisma migrate dev` applied it and reported the database in sync;
    `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
    printed `No difference detected` with exit 0, proving the applied migration chain
    reproduces `schema.prisma` exactly; the regenerated client exposes
    `polygon: runtime.JsonValue | null` (`prisma/generated/models/Lot.ts:223`).
  - No meaningful RED: a nullable schema column has no observable behaviour to
    assert before it exists, so verification here is structural and is recorded as
    such, per the ODD rule for non-testable changes. T02 carries the real RED.
  - Boundary adjustment: `LotRecord.polygon` and the validation wiring moved to
    T02/T03, because typing the field needs the value object's GeoJSON type, which
    T01 does not own. Recorded in L8.
  - Commit: _pending_.

- [ ] **T02 — `LotPolygon` value object + validity rules** (S9, S10)
  - Route: inline; strict TDD, pure domain, no I/O.
  - New `domain/lot-polygon.ts` implementing every rule of S9 with its exact
    message; extend the purity test's file list.
  - Check (RED first): `domain/lot-polygon.spec.ts` covering each S9 rule, at least
    one valid polygon, and the boundary values `±180` / `±90`.
  - Commit: _pending_.

- [x] **T03 — `/lots` contract** (S1, S2, S4, S10)
  - Route: inline.
  - `polygon` is accepted on create and update, validated through `LotPolygon`, and
    returned on every read. `coords` becomes optional on create, and is still
    rejected when provided but empty, so that behaviour is unchanged.
  - Evidence: the lot module suite went RED first on four `TS2353` errors (`polygon`
    absent from `CreateLotInput`, `UpdateLotInput` and `LotRecord`), then green at
    **65 tests across three suites**. `repository.create` is asserted both with and
    without each field, so omission is proven rather than assumed, and both
    rejection tests assert the value object's exact message **and** that no write
    reached the repository.
  - Client-visible message change: `POST /lots` used to answer `400` with
    `Missing required fields: name, farmId, coords, and area`. It now returns the
    domain message (`name is required`, `polygon ring must be closed: ...`) and the
    catch-all is gone from `lot.service.ts`. Nothing asserted the old text and no
    e2e covers `/lots`. Recorded in L12.
  - Removed from the create validation table: the assertion that a missing `coords`
    is invalid. It is the deliberate contract change of L12.
  - Adapter coverage: `prisma-lot.repository.spec.ts` was added after the adapter
    change, not before it; the RED for T03 was observed at the use-case boundary.
    Declared in L15. The lot module now runs **73 tests across four suites**.
  - Consumer check: `pnpm --filter nextjs build` exits 0 and still prerenders
    `/dashboard/mi-campo`, so the dashboards that read `/lots` did not break.
  - Commit: `9dd5994`.

- [x] **T04 — `LaborType.kind` + admin UI** (S6)
  - Route: inline.
  - `enum LaborKind { SIEMBRA PULVERIZACION FERTILIZACION COSECHA OTRO }` in
    `prisma/schema.prisma`, plus `LaborType.kind LaborKind @default(OTRO)`. Migration
    `20261012161801_add_labor_kind`, additive with a default, so existing rows become
    `OTRO` rather than failing.
  - `domain/labor-kind.ts` owns the vocabulary and `assertLaborKind`. Its message is
    built from `LABOR_KINDS` (`kind must be one of ${LABOR_KINDS.join(', ')}`) so the
    list can never drift from the message that describes it.
  - `kind` travels create → port → adapter. The port makes it **required** on create,
    so no future caller can silently lean on the database default.
  - Admin UI: a `SelectField` on `/dashboard/labores`, rendering `OTRO` as
    "Sin clasificar", plus a `Tipo` column so the admin can see what is classified.
    `kind` is required on `LaborTypeDTO` because the column is `NOT NULL` with a
    default: a missing value is a wiring bug, not a case to paper over.
  - Seeded vocabulary: `Pulverización` → `PULVERIZACION`, `Fertilización` →
    `FERTILIZACION`, `Siembra` → `SIEMBRA`, and `Arranque de equipo`, `Traslado`,
    `Pesaje` → `OTRO`. `Arranque de equipo` is *"Puesta en marcha y checklist"*, not a
    harvest, so it is left unclassified instead of guessed from its name — which is
    the entire point of having the column.
  - **`COSECHA` has no seeded labour type**, so `cosechado` stays unreachable until a
    tenant classifies a labour as such. Adding a `Cosecha` labour to the seed would
    be inventing vocabulary the client never gave.
  - Evidence: RED first — 5 suites failing with the missing `./labor-kind` module,
    `TS2353` for `kind` on three input types, and the schema assertions. Then green at
    **8 suites / 55 tests** in the module.
  - End-to-end beyond the unit tests: a scratch database `labor_kind_check` received
    `prisma migrate deploy` (every migration applied from empty), then the seed ran
    against it, and `SELECT name, kind FROM "LaborType"` returned exactly six rows:
    `Siembra` → SIEMBRA, `Pulverización` → PULVERIZACION, `Fertilización` →
    FERTILIZACION, and `Arranque de equipo`, `Pesaje`, `Traslado` → OTRO. The scratch
    database was dropped again. The development database was never seeded, because the
    seed wipes demo data.
  - Consumer check: `pnpm --filter nextjs build` exits 0 with `/dashboard/labores`
    prerendering, and `nest build` is clean — which also type checks `prisma/seed.ts`,
    since `tsconfig.build.json` carries no narrower `include`.
  - Commit: `eea47b8`.

- [x] **T05 — Lot state derivation** (S3, S5, S6, S11)
  - Route: inline.
  - `domain/lot-state.ts` holds `LOT_STATES`, `LotState`, the fact types and the pure
    `deriveLotState`; the rules it implements are S11.
  - `application/use-cases/derive-lot-states.use-case.ts` is a **new** use case rather
    than a change to `FindAllLotsUseCase`: the read keeps its narrow responsibility and
    the projection is its own tested unit. It short-circuits an empty lot list, and it
    copies rather than mutates the records it receives (asserted).
  - `adapters/outbound/prisma-lot-history.reader.ts` reads all three sources in one
    query each, so a list of lots costs three queries and not three per lot. It also
    gives every requested lot an entry, so the caller never has to tell "no history"
    from "not asked for".
  - `lot.service.ts` composes it on the list, the client-scoped list and the detail,
    so the projection cannot be present on one route and missing on another.
  - Evidence: `lot-state.rules.spec.ts`, `derive-lot-states.use-case.spec.ts` and
    `prisma-lot-history.reader.spec.ts` are new; `lot.module.spec.ts` is new too and
    asserts the DI graph reaches the history port, because a mis-wired token fails at
    application boot and no unit test would catch it. The module runs **106 tests
    across 8 suites**. Full-suite numbers in L21.
  - **RED was not observed for this task** — the implementation was written before the
    specs were first executed. L22 records the mutation check that was run instead.
  - Commit: `31f7b7e`.

- [x] **T06 — Real viewer** (S3, S7, S10)
  - Route: inline. `frontend-design` applies; the Flutter layout skills do not, because
    this is React.
  - `src/lib/geo-types.ts` now owns the geospatial vocabulary so `src/lib/lot-map.ts`
    can be compiled and executed on its own, without pulling the fetch layer in.
    `lot-map.ts` holds the pure parts: the lat/lng swap, the bounds union, the state
    colours and the undelimited count.
  - `src/components/ui/lot-map.tsx` is the Leaflet map, loaded through `next/dynamic`
    with `ssr: false` because Leaflet touches `window` at import time. Leaflet's
    stylesheet moved into `src/app/layout.tsx`, the canonical App Router place for a
    global CSS import, plus a small override so the container inherits the app's font
    and background instead of Leaflet's grey.
  - The mock is gone: `SatelliteMap` was deleted from `charts.tsx` (33 lines), and the
    fake zoom buttons, the `transform: scale()` and both the "no representa la
    geometría real" and "Proximamente" labels went with it, because the thing they
    disclaimed is now true. The KPI cards, the farm selector and the role scoping are
    untouched. The NDVI, weather and soil-moisture placeholders stay, because those
    are still true.
  - Evidence: `pnpm --filter nextjs build` exits 0 with type checking **active** —
    `next.config.ts` sets neither `ignoreBuildErrors` nor `ignoreDuringBuilds` — and
    Leaflet really is in the bundle (a 152K JS chunk and an 88K CSS chunk). The pure
    helpers were compiled with `tsc` and executed with `node` against 8 assertions, the
    only part of a UI change that can be checked without a browser. See L24.
  - **The viewer's runtime behaviour is unverified.** See L25 and T09.
  - Commit: `6d03dae`, plus `ff2a426` for the defect L26 records.

- [ ] **T09 — Verify the viewer in a browser** (S3, blocked on a human)
  - Route: not delegable. I cannot open a browser.
  - What to check on `/dashboard/mi-campo`, with an ADMIN user and with a PRODUCTOR
    user: that the imagery tiles load; that a lot with a polygon is drawn in its real
    position and not in the ocean; that its fill follows the derived state; that
    clicking a polygon selects the lot; that switching farm re-frames the map without
    a reload; and that the PRODUCTOR sees only their own client's lots.
  - Prerequisite: the seeded lots have **no polygons**, so a fresh database shows only
    the empty state. Either finish T07 and draw one, or `PUT /lots/:id` with a
    hand-written polygon for a smoke test.
  - Commit: none expected; this is a check.

- [ ] **T07 — Drawing capture** (S1, S4, S7, S9, S12)
  - Route: two disjoint work units: backend-derived area and Next.js drawing UI.
  - Draw/edit tools save against T03's endpoint. Only ADMIN and SUPERVISOR can save in this increment; PRODUCTOR and CONTRATISTA retain read-only access (S12).
  - The backend derives `area` from a newly saved polygon, rather than trusting the browser; existing area-only updates keep their current behavior.
  - Checks observed: backend RED on trusting a conflicting area, then 104 suites / 1003 tests green; `node --experimental-strip-types --test packages/nextjs/test/lot-map.test.mjs` passes three permanent helper tests; Next.js typecheck and build pass. The targeted ESLint run fails only on `react-hooks/set-state-in-effect` in `page.tsx`, reproduced identically on HEAD. Independent verification found and then confirmed correction of a false save-error message when PUT succeeded and GET refresh failed.
  - Still requires T09's browser check: draw, save, reload at the same position and test roles manually. Do not claim full runtime acceptance yet.
  - Implementation commit: `8a9c73e` (includes backend tests and a permanent Node geometry test); runtime acceptance remains open until T09.

- [ ] **T08 — Cross-ring polygon validity** (S9, accepted debt)
  - Route: inline, deferred.
  - A hole that touches or crosses the exterior ring is currently accepted because
    rings are validated independently. Close it when a real polygon editor makes it
    reachable: the drawing tool of T07 cannot produce a hole today.
  - Check (RED first): a polygon whose hole shares a vertex with the exterior ring is
    rejected.
  - Commit: _pending_.

- [x] **T10 — Guarded physical lot deletion** (S13-S14, S10, S12)
  - Route: backend work unit. Tenant-scoped `DELETE /lots/:id` for ADMIN/SUPERVISOR.
    A single Prisma transaction locks the tenant-scoped Lot row (`FOR UPDATE OF l`),
    checks every direct association without status/deleted filters, then deletes.
    Missing/cross-tenant returns 404; associated records return 409; successful
    physical deletion returns 204. No related record is deleted.
  - Check: 3 focused suites / 56 tests, full backend suite 104 suites / 1020
    tests and `pnpm --filter backend build` passed. `node test/lot-delete.integration.cjs`
    from `packages/backend` (after build) passed against a uniquely named scratch
    PostgreSQL database, then dropped it: real HTTP 404/409/204, lot/livestock
    unchanged after rejection, and FK key-share contention with `FOR UPDATE`
    prevents an association after deletion. Development records were untouched.
    Independent verifier found no code blocker; it correctly noted that mock
    unit/HTTP tests alone had not established DB semantics, motivating the scratch
    check. The initial 30-second focused Jest attempt timed out before the fix;
    the subsequent focused and full runs passed. No RED observed for T10.
  - Commit: `8665ed6`. Browser acceptance still belongs to T09.

- [x] **T11 — Add/remove controls in Mi Campo** (S13-S14, S12)
  - Route: Next.js work unit. Add lot with name and positive declared area using
    existing POST, confirm physical delete, display server rejection without
    removing the lot locally, and refresh on success. Never expose write controls
    to read-only roles.
  - Check: typed UI, API shape and failed/success feedback inspected; Next.js
    typecheck passed. No Next.js build while the dev server owns `.next`; browser
    creation/rejection/success and roles remain unverified in T09.
  - Commit: `d3bc4ff` (shared frontend work unit with T12).

- [x] **T12 — Remove individual draft vertices** (S13, S9, S12)
  - Route: Next.js map editor. Let the user remove a chosen vertex from the
    unsaved exterior-ring draft; keep other points, refuse save with fewer than
    three distinct positions, and preserve Cancel. Do not mutate storage until
    Save.
  - Check: pure Node geometry tests 4/4 passed and Next.js typecheck passed;
    browser interaction remains T09.
  - Commit: `d3bc4ff` (shared frontend work unit with T11).

## Log

- **L1 — the user's original request, verbatim:**
  > Inciemos con las tareas que tenemos asignadas para el tercer sprint, entremos en modo plan y pensemos como abordar las problematicas asignadas.
  > Te paso la primer tarea de hoy que tenemos en notion.
  > https://app.notion.com/p/Visor-SIG-de-Pol-gonos-Geoespaciales-Lotes-3c15961aad468126a61bee7e9422373d?v=3c15961aad4681bbb0a3000c19b21aa6&source=copy_link
  > No dudes en usar skill grill me, usar el inbox de obsidian para asentar informacion nuestra del desarrollo o el notion para asentar informacion general de como se va a abordar la tarea en cuestion que el resto del equipo pueda consultar.

- **L2 — the user's go-ahead, verbatim:**
  > Perfecto, salgamos de modo plan y entremos a la accion con el corte A.
  > Registra en obsidian el avance de la tarea y las decisiones relevantes, dejemos notion de lado por ahora.
  > Invoca un subajente para ir haciendo en paralelo el drift de documentacion.

- **L3 — decisions closed with the user** (2026-10-12): scope `Visor + captura por dibujo`;
  persistence `GeoJSON en columna Json`; state `Derivado del historial`; ordering
  `Modelo geoespacial primero`. `LaborTypeCategory` was proposed by the user as an
  existing classifier and **rejected on evidence**; closed as
  `LaborType.kind + refuerzo con Recipe`.

- **L4 — the plan's own error, corrected** (2026-10-12): the first draft of the plan
  promised a backfill from legacy `coords`. That is impossible: `coords` holds DMS
  display text. Withdrawn; T01 carries no backfill and the fact is recorded in the
  Obsidian note.

- **L5 — scope correction** (2026-10-12): the plan described three cortes. Splitting
  `LaborType.kind` and the state derivation out of the viewer corte yields seven
  tasks, because that work is schema plus admin UI plus derivation and does not fit
  alongside a map rewrite in one unit.

- **L6 — branch** (2026-10-12): `feat/lot-polygon-sig` cut from `dev` = `a50a882`,
  confirmed in sync with `origin/dev` (0 ahead, 0 behind).

- **L7 — documentation drift delegated** (2026-10-12): a background worker is
  correcting the `context:` block of `openspec/config.yaml`, which claims
  `packages/web -> Next.js (admin/auditor)` while `packages/web` is a Flutter
  skeleton and the real dashboard is `packages/nextjs`. Allowed edit surface is that
  one file; the worker was told not to commit. Note: that file is **untracked** in Git.
  The worker finished and corrected **two** false claims: the `packages/web` one, and
  a language claim that asserted Spanish enum values everywhere while the mobile
  enums are English. All other claims in that block were verified true. Nothing was
  committed.

- **L8 — T01 done, task boundary adjusted** (2026-10-12): schema column and migration
  landed and verified. The `LotRecord.polygon` type plus the validator wiring were
  moved out of T01 into T02/T03: typing the record field requires the value object's
  GeoJSON type, and T01 owns no domain code. The ODD task list was rewritten to match.

- **L9 — verification tooling note for the next agent** (2026-10-12): Prisma 7
  **removed** `--shadow-database-url` from `prisma migrate diff`, and its source flags
  are now `--from-schema` / `--to-schema` / `--from-migrations` / `--to-migrations` /
  `--from-config-datasource` / `--to-config-datasource`. The sprint-2 recipe
  (`--from-migrations ... --shadow-database-url ...`) **no longer runs** and exits 1
  printing only the usage text. The working equivalent is
  `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`,
  which compares the live database against the datamodel.

- **L10 — local environment** (2026-10-12): the Postgres container was **not**
  running; it was started with `docker compose up -d` using credentials parsed out of
  `DATABASE_URL` (the compose file requires `POSTGRES_PASSWORD` and the root `.env`
  does not define it). The database was already in sync with the pre-change schema
  (8 migrations). A scratch database `polygon_shadow` was created and dropped again.

- **L11 — T03 done** (2026-10-12): the `/lots` contract now carries `polygon` in,
  through and out. Commits `cbb315b` (T01) and `fd2d09c` (T02) preceded it. The
  module suite is green at 65 tests.

- **L12 — deliberate contract change on `POST /lots`** (2026-10-12): two changes,
  both intentional. (a) `coords` stops being required, because CUU02 separates
  creating a lot from delimiting it; widening acceptance cannot break a caller that
  still sends `coords`, and the existing test asserting the old requirement was
  removed with that reasoning. (b) The `400` body now carries the domain message
  instead of the catch-all `Missing required fields: name, farmId, coords, and area`.
  The catch-all named `coords` — now optional — and it hid from the client the very
  polygon rule it had to fix. Verified before changing: the string existed only in
  `lot.service.ts` and no test or e2e asserted it.

- **L13 — the adapter now maps rows** (2026-10-12): `prisma-lot.repository.ts` gained
  a private `toRecord` that narrows Prisma's `JsonValue` to `GeoJsonPolygon | null`.
  The cast states an invariant that holds because every write passes through
  `LotPolygon.fromGeoJson`; re-validating on every read would pay for a guarantee the
  write boundary already made. This is the first `Json?` column in the codebase, so
  there was no precedent to copy.

- **L14 — spec typing** (2026-10-12): with `LotRecord.polygon` strongly typed, the
  `square` fixture in the use-case spec needed an explicit `: GeoJsonPolygon`
  annotation; a bare object literal widens `type` to `string` and does not satisfy
  the contract type.

- **L15 — declared test-order deviation** (2026-10-12):
  `adapters/outbound/prisma-lot.repository.spec.ts` was written **after** the adapter
  change, not before it. The RED for T03 was observed at the use-case boundary (four
  `TS2353` errors) and that is where the rule being changed lives; the adapter spec
  closes a coverage gap on the new mapping and cast. Recorded rather than presented
  as test-first. It is a real check: it runs against the new code and would fail if
  the mapper or the key omission regressed.

- **L16 — Corte A closed** (2026-10-12): T01 `cbb315b`, T02 `fd2d09c`, T03 `9dd5994`
  on `feat/lot-polygon-sig`. Evidence at close: backend suite **98 suites / 937
  tests green**; `nest build` clean; `pnpm --filter nextjs build` exit 0 with
  `/dashboard/mi-campo` still prerendered; `prisma migrate diff` reporting no
  difference between the live database and `schema.prisma`. The backend is now able
  to store, validate and serve a real polygon. Nothing renders it yet: T04–T07 remain.

- **L17 — the native assessment failed, so an independent verifier ran** (2026-10-12):
  `assess` returned `risk: unassessable` with
  `native review assess failed: Error: untracked files require an explicit declaration`,
  caused by untracked paths that are not part of this feature (`.codegraph/`,
  `openspec/config.yaml`, `packages/nextjs/AGENTS.md`, `packages/nextjs/CLAUDE.md`).
  Its plan required `independentVerifier: true`, treated the candidate as high risk,
  and that verifier found **two real defects**: the self-intersection test counted
  only proper crossings (a ring pinched at a shared vertex, or with a collinear
  overlap, was accepted), and the adapter's claimed invariant — "every write goes
  through `LotPolygon.fromGeoJson`" — is false, because
  `entities/client/adapters/outbound/prisma-client.repository.ts` also creates lots.
  It also found two test-quality gaps: the message assertions used Jest's substring
  form instead of equality, and the area assertions were broad bounds rather than a
  reference. The untracked declaration remains open for the user; it is not mine to
  settle.

- **L18 — defects fixed and re-verified** (2026-10-12): `segmentsProperlyIntersect`
  became `segmentsIntersect` and now also rejects an endpoint lying on the other
  edge, which covers endpoint touching and collinear overlap; the redundant `2 +`
  constant left the trapezoid term; the adapter comment now states the real
  invariant and names the other writer. Message assertions became exact for all nine
  rules, the area claims became a closed-form spherical-cell reference, and a
  reversed-winding test was added. The second verification round confirmed no false
  positives and the hole subtraction is winding-independent, but found **one surviving
  defect**: a zero-length edge, from a consecutively repeated position, is adjacent to
  both edges it meets and so was skipped — the new rule 7 of S9 closes it. That made
  **S9 change**, so it is recorded here rather than slipped in silently. Evidence:
  **99 suites / 948 tests green**, `nest build` clean.

- **L19 — `prisma migrate dev` does not regenerate the client in this repository**
  (2026-10-12): Prisma 7 reads `prisma.config.ts` here, and `migrate dev` applies the
  migration, reports the database in sync, and leaves `prisma/generated/**` stale.
  Both T01 and T04 needed an explicit `npx prisma generate`. The failure mode is
  confusing: the new column exists in the database and in `schema.prisma`, but every
  Prisma call in the adapter fails type checking because the generated model lacks the
  field. Run `prisma generate` after every schema change, before trusting a test run.

- **L20 — T04 done, and one vocabulary gap it exposed** (2026-10-12): `LaborType.kind`
  now exists end to end, with the admin able to classify a labour from
  `/dashboard/labores`. Two contract notes: the create port requires `kind`, so the
  adapter can no longer rely on the database default and the repository spec's create
  assertion had to name `OTRO`; and `POST`/`PUT /labor-types` accept `kind`, which
  reaches the client through the existing `BadRequestException(error.message)` mapping
  in `labor-type.service.ts` with no change needed there.

  The gap: **no seeded labour type is `COSECHA`**. The catalogue has Pulverización,
  Fertilización, Siembra, Arranque de equipo, Traslado and Pesaje, and only the first
  three describe a crop action. So `cosechado` is unreachable from the seed, and T05
  must derive it only when a tenant creates or reclassifies a harvest labour. Recorded
  rather than worked around by inventing a `Cosecha` row.

  Evidence: RED first, then **100 suites / 974 tests green**, `nest build` clean, and
  `pnpm --filter nextjs build` exit 0. The seed was proven on a scratch database rather
  than by inspection, because a wrong enum member in `prisma/seed.ts` is only a string
  until a database rejects it.

- **L21 — T05 done, and S11 was written to freeze it** (2026-10-12): the lot state is
  derived in the domain and returned as a projection on both `/lots` and `/lots/:id`.
  Writing S11 exposed something worth stating out loud: a labour whose kind is `OTRO`
  is **not an event**, so with the seeded vocabulary the only lots that leave `libre`
  are the ones with a classified labour — and because no seeded labour is `COSECHA`,
  `cosechado` cannot occur from the seed. That is the honest consequence of T04's
  finding, not a gap to paper over with a guessed default.

  Evidence at close: **103 suites / 998 tests green**, `nest build` clean, and
  `pnpm --filter nextjs build` exit 0. Commit `31f7b7e`.

- **L22 — declared deviation: RED was not observed for T05** (2026-10-12): the three new
  spec files were written and then the implementation was written immediately after,
  and the first execution already passed — 102 tests green. No RED was seen. Rather
  than claim test-first on a run that never failed, a mutation check was run: the body
  of `deriveLotState` was replaced with a bare `return "libre";`, the domain specs were
  executed, and **12 of 18 tests failed** while the six that legitimately expect `libre`
  kept passing. The file was restored byte-identical from a backup and the restoration
  was verified with `diff -q`. That establishes the tests are real checks rather than
  restatements of the code, but it is not the same as observing RED, and it is recorded
  as what it is.

- **L23 — a client-side gap carried over from T03, closed here** (2026-10-12): the
  backend has returned `polygon` on `/lots` since `9dd5994`, but `LotDTO` in
  `packages/nextjs/src/api/client.ts` was never widened to declare it. Nothing consumed
  the field, so no build failed — which is exactly why it went unnoticed. It is closed
  now together with `state`, because T06 is the first consumer of both, and a silently
  missing field in a hand-maintained DTO is the kind of thing that surfaces as
  `undefined` at render time rather than as a compile error.

- **L24 — T06: the map library, and what the standalone compile caught** (2026-10-12):
  chose **Leaflet 1.9 + react-leaflet 5** over MapLibre GL. Raster tiles need no key,
  the API is small enough to review, and the drawing tools T07 needs are mature.
  MapLibre renders vectors better and is the stronger long-term answer, but it needs a
  tile source with a token, and that is a decision for the team with a budget rather
  than something to slip into a sprint. Imagery is Esri World Imagery, the same
  "satellite" intent the mock announced, and it is documented as needing a real tile
  contract before production.

  Adding a runtime dependency is Risk item 5 and the only part of this corte that
  touches the build.

  The pure helpers were compiled with `tsc` into a scratch directory and executed with
  `node` under 8 assertions. That caught two things `next build` would not have: a
  missing `GeoJsonPosition` import, and `countUndelimited` returning 1 where I expected
  2, because an absent `polygon` is `undefined` and not `null`. The second was both my
  assertion being wrong about the world and the function being wrong about its
  contract — a counter that under-reports when a field is absent is a quietly wrong
  number — so it now treats absent and null alike.

- **L25 — declared runtime verification gap for T06** (2026-10-12): `packages/nextjs`
  has no test runner, so nothing about the viewer's behaviour is asserted: tiles
  rendering, fit-bounds, click-to-select and colour are verified by compilation and by
  reading, never by execution. I cannot open a browser, so this needs a human pass on
  `/dashboard/mi-campo` with an ADMIN user and with a PRODUCTOR user before the corte
  can be called done. The previous sprint carried the same kind of gap on its admin
  screens, so it is recorded rather than hidden.

  Practical consequence: the seeded lots have display-only `coords` and **no
  polygons**, so a fresh database shows the viewer's empty state and nothing else.
  Seed polygons were deliberately **not** invented, because a drawn polygon's computed
  area would contradict the declared `area` on every demo lot and there is still no
  decision about which of the two wins. Two ways to see it work: finish T07 and draw
  one, or `PUT /lots/:id` with a hand-written polygon for a smoke test.

- **L26 — T06 verified, one real defect found and fixed** (2026-10-12): an independent
  verifier confirmed the highest-risk line with a worked example rather than by reading
  variable names. The square fixture reaches Leaflet as latitude −33.4..−33.3 and
  longitude −62.3..−62.2, which is Argentina and consistent with the seed's
  `33° 23' S · 62° 18' O`, so the swap is correct. It also confirmed the empty state is
  honest, Leaflet's stylesheet is imported exactly once, the React 19 peers resolve in
  the lockfile, and `charts.tsx` lost nothing but `SatelliteMap`.

  It found **one reproducible defect**. The reframe key was built from lot ids and
  derived states, so a polygon whose coordinates changed while its id and state stayed
  the same left the map framed on the old shape. That is precisely what drawing and
  adjusting a polygon does, which means the bug was scheduled to land with T07. Fixed
  in `ff2a426` by keying on the signature of the framed box itself: when the box does
  not change, reframing would be a no-op anyway. The regression is now asserted in the
  pure helper check, which runs 11 assertions.

  It judged the `bounds` prop on `MapContainer` together with `FitBounds`'s `fitBounds`
  as harmless redundancy rather than a defect, because the prop prevents an initial
  render at zoom 0. A comment now says so, so a reviewer does not read it as an
  accident.

- **L27 — resumed T07 / user decision** (2026-10-16): the Notion task remains marked
  `Sin empezar` although the repository records T01–T06 as complete; Notion's technical
  approach page predates these commits and still promises an impossible `coords` backfill.
  The user's current request was, verbatim: "Continuemos con el trabajo que veniamos
  haciendo sobre el modulo sig que habia pendiente en notion". Asked who can save
  drawings because S1 includes PRODUCTOR/CONTRATISTA but `PUT /lots/:id` permits only
  ADMIN/SUPERVISOR. The user chose, verbatim: "Solo ADMIN y SUPERVISOR por ahora".
  S12 freezes that limit; no role-guard relaxation is authorized. The drawing feature
  must work when no lot has a polygon yet, and area is computed server-side from the
  validated polygon, while existing explicit area-only edits remain unchanged.

- **L28 — T07 implementation and verification gap** (2026-10-16): backend area is
  derived by `LotPolygon.areaHectares()` when updating a non-null polygon; explicit
  area-only updates retain their old behavior. The backend test observed RED first
  (provided area `1` incorrectly persisted instead of approximately `10328.282`),
  then the lot suite passed 107/107 and the full backend suite passed 104 suites /
  1003 tests. Next.js has a manual Leaflet vertex editor that works on an empty map,
  converts lat/lng into a deduplicated closed GeoJSON ring, saves via PUT, and refreshes
  from the server. A permanent Node test now checks the pure conversion, boundaries
  and fallback location (3/3 green); it was added after the implementation, so it is
  regression proof, not evidence of RED. Next.js typecheck and build passed; the
  targeted ESLint invocation fails on `react-hooks/set-state-in-effect` in the
  pre-existing `useEffect(() => void load())`, reproduced on HEAD. An independent
  verifier found one candidate-caused bug: successful PUT followed by failed GET
  falsely reported an unsuccessful save. The fix retains the PUT response's polygon
  and area, leaves editing mode and shows a truthful refresh warning; a narrow
  read-only re-verification confirmed it. No browser interaction was available, so
  T09's draw/save/reload and role checks remain unverified and T07 stays open.
  Implementation work-unit commit: `8a9c73e`.

- **L29 — the user's follow-up, verbatim** (2026-10-16):
  > Nos faltan las opciones para:
  > - agregar/quitar lotes -> quitar debe validar que no haya trabajos asociados activos o no
  > - quitar vertices de un lote

  The existing `POST /lots` needs a positive `area` even without geometry. There
  is no `DELETE /lots/:id`. `Lot` is referenced by Task, Recipe, DailyReport,
  Livestock and LivestockMovement; `MachineUsage` refers via Task. The user selected,
  verbatim: "Borrarlo físicamente solo si no tiene ninguna relación". T10–T12
  separate deletion integrity, lot UI, and vertex editing; no actual development
  records are deleted to verify them.

- **L30 — deletion race discovered before accepting T10** (2026-10-16):
  `packages/backend/prisma/migrations/20260922214007_multifirma_baseline/migration.sql`
  defines `Livestock_lotId_fkey` as `ON DELETE SET NULL`, unlike the Task,
  Recipe, DailyReport and LivestockMovement FKs that use `RESTRICT`. A standalone
  `hasDirectRelations` preflight followed by `deleteMany` and P2003 handling could
  delete the lot and silently detach a livestock newly linked during that race.
  T10 now requires a row lock and fresh association check in one transaction, or
  it must stop blocked; no real database record may be deleted to test it.

- **L31 — T10–T12 checks and integration limits** (2026-10-16):
  T11–T12 frontend work-unit commit `d3bc4ff`: 4/4 Node helper tests and Next.js
  typecheck green. The Next.js build was not run because the live dev server uses
  `.next`; browser creation, guarded delete feedback and vertex editing remain T09.
  T10 backend commit `8665ed6`: 56 focused tests, full backend suite 104/1020,
  and Nest build green. A test-created, uniquely named scratch database received
  the actual Prisma migrations; HTTP exercised 404, 409 and 204, proving that a
  rejected delete preserves the lot and livestock link. Two PostgreSQL connections
  demonstrated that a child FK association cannot pass a parent `FOR UPDATE`
  followed by deletion; after commit it fails without detaching the animal.
  The scratch database was dropped and no development records were deleted. This
  tests the FK lock behavior deterministically, not an instrumented interleaving
  inside the HTTP endpoint. An independent read-only verifier found no code-level
  blocker, but correctly distinguished that prior mock tests were insufficient.
  The first Jest attempt exhausted its 30-second foreground limit; its later
  background focused run and full suite passed. T10 had no observed RED. The
  backend development server was paused before fixing the unsafe partial route,
  then restarted after checks; unauthenticated `/lots` responds 401 on port 3001
  and frontend `/dashboard/mi-campo` responds 200 on port 3002. The user still
  needs to exercise creation, blocked and successful deletion, and vertex editing
  in a browser (T09). Native RDD ASSESS of the backend work-unit slice returned
  `unassessable` because unrelated untracked files require explicit declaration;
  no untracked files were removed or implicitly included. Its conservative high
  risk plan's independent verification was performed, but native review itself
  was unavailable. No PR, push or merge was performed.
