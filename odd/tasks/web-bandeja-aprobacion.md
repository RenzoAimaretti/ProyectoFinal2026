# Feature: Web Bandeja de Aprobación de Partes Diarios

Sprint 2 deliverable (owner: Juan Manuel de Elia, Web). Build the Next.js
"Bandeja de Aprobación de Partes Diarios" with a notebook viewer, working
end-to-end against the merged NestJS backend.

## Objective

An admin opens the web inbox, sees the daily reports (`DailyReport`) uploaded by
operators in `PENDIENTE_APROBACION`, opens one, reviews it in a "cuaderno"
(digitized notebook page) viewer with its attached photos when present, and
approves (deducts client stock) or rejects with a reason.

## Problem

`packages/nextjs` only has static layouts and a read-only, unauthenticated
`apiGet` with hardcoded demo shapes. The backend (merged from
`origin/UI-PersistenciaLocal`) requires a JWT and exposes no approve/reject HTTP
endpoint, no joined names, and no photo read endpoint. Photos are never uploaded
to the backend (mobile keeps them local), so the notebook viewer must show an
honest empty state.

## Why

Roadmap Sprint 2, phase "Insumos Recetas & ...". Vision `doc/vision.md:87-89`
("Bandeja de entrada con partes cargados por operarios... Visualizador de imagen
adjunta... botón de aprobación"). CUU05. Product decision (user): viewer shows
real photos when they exist, honest empty state otherwise.

## Scope

In scope:
- `packages/nextjs`: auth (login + token), API client, bandeja page, notebook
  viewer, master-detail UI, nav entry, design-system extensions.
- `packages/backend`: additive-only endpoints and read enrichment in
  `entities/daily-report` + a read-only photo controller.

Out of scope:
- `packages/mobile` / Flutter (another developer). No mobile edits.
- Photo upload/sync pipeline (mobile-owned, Ignacio Sprint 2/5).
- Multi-firma billing, Prisma schema changes, migrations.
- Rewriting Renzo's existing domain behavior. Changes must be additive.

## Constraints

- Do not overwrite/duplicate colleague work. `DailyReport`/`Reception`/`Input`/
  `Photo` entities already exist in `packages/backend`; reuse them.
- Backend artifacts/tests stay in English. Conversation stays Spanish.
- No `prisma migrate dev`; no schema changes.
- Load `.agents/skills/nestjs-best-practices`, `agrolify-hexagonal-architecture`
  for backend; `.agents/skills/frontend-design` for web.

## Frozen API contract (both writers build against this)

Auth (existing):
- `POST /auth/login` `{ email, password }` -> `{ accessToken, refreshToken, user: { id, email, role, tenantId, firmaId } }`
- All other calls: `Authorization: Bearer <accessToken>`.

Daily reports:
- `GET /daily-reports` -> `DailyReportDTO[]`
- `GET /daily-reports/:id` -> `DailyReportDTO`
- `POST /daily-reports/:id/approve` -> `DailyReportDTO` (status `APROBADO`)
- `POST /daily-reports/:id/reject` `{ reason }` -> `DailyReportDTO` (status `RECHAZADO`)
- `GET /daily-reports/:id/photos` -> `PhotoDTO[]`

`DailyReportDTO`:
```
{
  id, companyId, companyName,
  operatorId, operatorName,
  taskId, taskTypeId, taskTypeName,
  lotId, lotName, farmName, clientName,
  date, hectares, hours,
  status: "PENDIENTE_APROBACION" | "APROBADO" | "RECHAZADO",
  rejectionReason, approvedAt, approvedBy, approvedByName,
  createdAt, updatedAt,
  items: [{ id, inputId, inputName, quantity, unit }]
}
```
`PhotoDTO`: `{ id, entityType, entityId, localPath, orderIndex, createdAt }`

Error mapping (approve/reject):
- 404 `EntityNotFoundError`
- 400 `InvalidInputError` / `InvalidRelationError` / blank reject reason
- 409 `InvalidStateTransitionError`
- 409 `InsufficientStockError` -> `{ statusCode: 409, code: "INSUFFICIENT_STOCK", message, clientId, inputId, required, available }`

## Tasks

- [ ] T1 [backend] Approve endpoint `POST /daily-reports/:id/approve` wired to
  the existing `ApproveDailyReportUseCase`; map domain errors to 404/400/409.
- [ ] T2 [backend] Reject path: `RejectDailyReportUseCase` + `assertRejectionReason`
  rule + repository writer + `POST /daily-reports/:id/reject` (mirror
  `reject-reception`). Sets `RECHAZADO` + `rejectionReason`; no stock deduction.
- [ ] T3 [backend] Enrich daily-report reads with joined names (company, operator,
  taskType, lot, farm, client, input) via optional fields on `DailyReportRecord`
  populated in the Prisma read/approval adapters. Backward compatible.
- [ ] T4 [backend] Read-only photo controller `GET /daily-reports/:id/photos`
  using the existing `ListEntityPhotos` use case.
- [ ] T5 [backend] Unit tests for T1-T4; keep all existing daily-report tests green.
- [ ] T6 [web] Auth layer: `/login` page, token storage, `Authorization` on all
  requests, 401 handling, dashboard route guard. Fixes the merge regression where
  existing dashboards now hit guarded endpoints.
- [ ] T7 [web] API client: `apiPost`, `DailyReportDTO`/`PhotoDTO`, list/detail/
  approve/reject/photos functions, typed `ApiError { status, code }`.
- [ ] T8 [web] Bandeja page `/dashboard/bandeja-aprobacion`: list + filters
  (status/date/search), status badges, operario/campo-lote/labor/ha-hs.
- [ ] T9 [web] Notebook viewer (master-detail): header, amounts, insumos table,
  photo strip with empty state, Approve + Reject(reason) actions.
- [ ] T10 [web] Design-system extensions (Button variant/disabled, Drawer/Modal,
  StatusBadge) following `frontend-design`.
- [ ] T11 [web] `nav.ts` entry + `modulosPorRol` visibility for admin.
- [ ] T12 [env] `DATABASE_URL` (localhost:5433) + `prisma migrate reset` + seed.
- [ ] T13 [verify] End-to-end: backend up + seed + web login + list + approve +
  reject + photos empty state.

## Acceptance criteria

- Admin logs in with the seeded user and reaches the bandeja.
- The bandeja lists seeded reports with readable names (not ids) and filters.
- Opening a report shows the notebook viewer with all data, insumos and a photo
  strip (empty state when no photos).
- Approve transitions to `APROBADO` and deducts client stock; insufficient stock
  returns a clear 409 shown in the UI.
- Reject with a reason transitions to `RECHAZADO` and shows the reason.
- Existing backend tests stay green; `nest build` and `next build` pass.

## Verification

- Backend: `pnpm --filter backend build`, `pnpm --filter backend test daily-report`.
- Web: `pnpm --filter nextjs build`.
- E2E: DB reset+seed, backend on :3001, `next dev`, login, list, approve, reject.

## Delivery

- `delivery_strategy: ask-on-risk`. Forecast > 400 authored changed lines:
  PR slicing (chained/stacked) must be decided before opening a PR. Work-unit
  commits on `BandejaParteDiario` are authorized; push/PR remain the user's call.

## Progress log

- Integration: merged `origin/UI-PersistenciaLocal` into `BandejaParteDiario`
  (commit `5b35f72`). Seed conflict resolved (bootstrap + multifirma demo data
  incl. 5 daily reports). `nest build` OK, 99 daily-report tests green.
- DB discovered at localhost:5433; `DATABASE_URL` missing from backend `.env`.
