# ODD — merge-dev-into-recetas

> Organic Driven Development feature document.
> Engram mirror: `odd/merge-dev-into-recetas/tasks`
> Source branch: `RecetasFitosanitarias` (f5155ab) · target: `origin/dev` (9611556)
> Merge base: `a9e07e7` · safety tag: `backup/pre-dev-merge-2026-10-20`

## Objective

Bring everything implemented on `origin/dev` into `RecetasFitosanitarias` while
keeping this branch's layouts, design system and recetas fitosanitarias module,
so one branch carries both the new console UI and the SIG viewer, machinery,
labour catalogs and input categories.

## Problem

The two branches diverged for 75 commits (`dev`) and 21 commits
(`RecetasFitosanitarias`) from the same base, touching 329 and 132 files.
They overlap on 31 files, and the overlap is semantic, not cosmetic:

- `dev` renamed `TaskType` → `LaborType` (schema, migrations, backend module,
  API routes and frontend DTOs) and renamed `Task.taskTypeId` →
  `Task.laborTypeId`.
- `RecetasFitosanitarias` added `TaskType.requiresPrescription`,
  `Task.prescriptionStatus`, the `INGENIERO` role and the prescription module
  directly on top of `TaskType`.
- Both rewrote the same Next.js pages: this branch redesigned them, `dev`
  changed their behaviour.

A plain "ours" resolution would lose the SIG viewer; a plain "theirs" would lose
the redesign and break recetas.

## Scope

In scope: merge resolution, schema/migration composition, backend adaptation of
the recetas module to the `LaborType` rename, frontend integration of `dev`
features into this branch's design system.

Out of scope: applying migrations to the developer's local database, pushing,
opening a PR, mobile runtime verification (Flutter SDK not installed here).

## Decisions

- **D1 — Layout wins on this branch.** For every page both branches touched, the
  `RecetasFitosanitarias` visual structure is the base; `dev` behaviour is
  grafted into it.
- **D2 — `TaskType` is now `LaborType`.** The recetas API surface
  (`PendingPrescriptionTaskDTO`) was renamed to `laborTypeId` / `laborTypeName`
  and `TaskPrescriptionContext.laborTypeRequiresPrescription`, matching `dev`'s
  naming, instead of keeping two vocabularies.
- **D3 — One migration chain, edited in place.** The recetas migration
  (`20261015210000`) now alters `"LaborType"`, because on a fresh database
  `dev`'s rename migration runs first. On a database that already applied the
  recetas migration, the later rename migration carries the column over.
- **D4 — Prisma client is regenerated, never hand-merged.** Generated files were
  replaced with `origin/dev`'s tree and then regenerated from the merged schema.
- **D5 — New `dev` pages keep their logic, inherit the design system.** A
  `PageHeader` component was restored in `ui/primitives.tsx`, rendered as the
  branch's operational plate, so `categorias` and `labores` match the rest of
  the console without being rewritten.

## Tasks

- [x] **T01 — Snapshot and merge.** Tag `backup/pre-dev-merge-2026-10-20` created;
  `git merge origin/dev --no-commit --no-ff` produced 16 conflicted files.
- [x] **T02 — Prisma schema.** Kept `LaborType.requiresPrescription` and
  `LaborType.kind`; `Task` uses `laborTypeId` + `prescriptionStatus`; enums
  `PrescriptionStatus`, `DosageBasis`, `InputUnit`, `LaborKind` all present.
- [x] **T03 — Migration chain.** `20261015210000_add_prescription_and_ingeniero_role`
  targets `"LaborType"`. Verified on an isolated fresh database: all 17
  migrations apply, `prisma migrate diff` reports **no difference** against the
  merged schema.
- [x] **T04 — Backend code.** Recetas adapter/ports/types/tests renamed to
  `laborType`; `create-task.use-case` reads
  `laborType.requiresPrescription`; labour-type controller/spec keep the
  `INGENIERO` read role; deleted `task-type` entity stays deleted.
- [x] **T05 — Backend verification.** `nest build` clean, `tsc --noEmit` clean,
  **122 suites / 1268 tests passing**.
- [x] **T06 — Frontend design integration.** `nav.ts` keeps this branch's grouped
  rail plus `Categorías` and `Labores`, with role visibility updated; Leaflet
  import and `.leaflet-container` theme rules merged; `CheckboxGroup` merged;
  `PageHeader` re-added in this branch's style.
- [x] **T07 — Pages.** `mi-campo` rewritten as this branch's master–detail plus a
  full-width real SIG panel (draw/edit/delete lot, derived states, legend);
  `maquinaria` takes `dev`'s full fleet logic with this branch's header and
  typographic classes; `bandeja-aprobacion` and `produccion` keep this branch's
  layout and recetas integration, renamed to `laborTypeName`; `categorias` and
  `labores` kept from `dev`.
- [x] **T08 — Frontend verification.** `tsc --noEmit` clean, `next build` clean
  (21 routes incl. `/dashboard/mi-campo`, `/dashboard/categorias`,
  `/dashboard/labores`), `node --test` 8/8 passing.
- [x] **T09 — Apply migrations to the local database.** Backup taken first
  (`proyectofinal_premerge.dump`, custom format, outside the repo), then
  `prisma migrate deploy` applied the 12 pending `dev` migrations. Status is up
  to date and `migrate diff` reports no drift against the merged schema.
- [x] **T10 — Seed and runtime smoke.** `SEED_INGENIERO_PASSWORD` added to the
  gitignored `packages/backend/.env`, `npm run db:seed` reseeded the demo data,
  the stale `dist/main.js` process was replaced with the merged build, and the
  API was exercised over HTTP.

## Verification evidence

| Check | Command | Result |
| --- | --- | --- |
| Prisma schema | `npx prisma validate` | valid |
| Migration chain | `prisma migrate deploy` on `merge_check` DB | 17/17 applied |
| Migration drift | `prisma migrate diff --from-config-datasource --to-schema` | no difference |
| Local DB migrate | `prisma migrate deploy` on `proyectofinal` | 12 pending applied, 17/17 total |
| Local DB drift | `prisma migrate diff --from-config-datasource --to-schema` | no difference |
| Data preserved | SQL counts after deploy | 1 tenant, 5 inputs (5 categorized), 10 stocks, 3 recipes, `Task.prescriptionStatus` unchanged, `LaborType.requiresPrescription` survived the rename |
| Backend types | `npx tsc -p tsconfig.json --noEmit` | clean |
| Backend build | `npm run build` | clean |
| Backend tests | `npm test` | 122 suites, 1268 tests passed |
| Frontend types | `npx tsc --noEmit` | clean |
| Frontend build | `npm run build` | 21 routes, clean |
| Frontend unit tests | `node --test test/*.test.mjs` | 8/8 passed |
| Demo seed | `npm run db:seed` | bootstrap OK: 2 clients, 5 inputs, 6 labor types, 2 farms, 7 lots, 12 tasks, 5 daily reports, 10 stocks |
| Runtime smoke (ADMIN) | `POST /auth/login`, `GET /tasks`, `/lots`, `/prescriptions/pending`, `/labor-types`, `/input-categories` | 200; tasks expose `laborTypeName` + `prescriptionStatus`; lots expose `polygon` + `state`; pending exposes `laborTypeName` |
| Runtime smoke (INGENIERO) | `POST /auth/login`, `GET /tasks`, `/labor-types`, `/prescriptions/pending` | 200; agronomist reads the inbox and labour catalog |

## Known gaps

- Flutter SDK is not installed in this environment, so `packages/mobile`
  (changed only by `dev`) was not analysed or tested here.
- The demo seed leaves `MaintenanceThreshold` empty and no lot has a polygon;
  both are created through the UI (`/dashboard/maquinaria` threshold form and the
  `mi-campo` drawing tools), which is `dev`'s intended flow.
- `npm run lint` on `packages/nextjs` reports one pre-existing
  `react-hooks/set-state-in-effect` error in `src/components/ui/reveal.tsx`, a
  file untouched by this merge.
