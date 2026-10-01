# Feature: Insumos admin auto-validate + Producción daily task board

Two business corrections from the product owner.

## 1. Insumos — admin-registered income is already final

If the **ADMIN** registers an ingreso (reception), it must land already validated
and enter stock; it is NOT sent to the validation inbox again. Only ingreso
created by the **client** stays `PENDIENTE_VALIDACION` for admin validation.

### Change
- `POST /receptions`: when `req.user.role === 'ADMIN'`, create the reception and
  immediately validate it (stock applied), returning it as `VALIDADA`. When the
  caller is not an admin (client), keep `PENDIENTE_VALIDACION` (unchanged).
- Web `insumos`: the admin "Registrar ingreso" no longer asks for a later
  validation; the created row shows as `VALIDADA`. The pending inbox lists only
  client-created `PENDIENTE_VALIDACION` items.

## 2. Producción — the day's tasks board

Producción is the board of the day's tasks: which field (campo/lote) they run in,
which labour, and their status. It is NOT the daily report (parte) nor its
approval.

### Change
- Backend: enrich task reads with `lotName`, `farmName`, `taskTypeName` and
  `operators: [{ id, name }]` (Prisma includes lot→farm, taskType, operators).
  Additive/optional fields.
- Backend seed: create several tasks dated `today` (dynamic `new Date()`) across
  the two campos with mixed statuses so the day board has content.
- Web `produccion`: a "Tareas del día" board with a date picker (default today),
  grouped by campo/lote, each task showing labour, status and operators. Remove
  the "+ Cargar parte" action and the recipe card (they belong to other flows:
  the operator's parte is loaded from mobile and approved in Bandeja).

## Frozen contract

- `POST /receptions` body `{clientId, date, items:[{inputId, quantity}]}` ->
  `VALIDADA` when admin, `PENDIENTE_VALIDACION` when client.
- `GET /tasks` -> `{ id, lotId, lotName, farmName, taskTypeId, taskTypeName,
  status, startedAt, finishedAt, operators:[{id,name}] }`.

## Tasks

- [ ] B1 [backend] admin auto-validate on `POST /receptions`.
- [ ] B2 [backend] enrich task reads (lot/farm/taskType/operators + names).
- [ ] B3 [backend] seed today's tasks across campos and statuses.
- [ ] P1 [web] insumos: admin ingreso lands validado; inbox only pending from clients.
- [ ] P2 [web] produccion: day task board by campo/estado; drop parte + recipe.
- [ ] V1 verify: backend tests + `next build` + HTTP smoke.

## Acceptance

- Admin-created ingreso -> `VALIDADA` and stock increased; client-created -> pending.
- Producción shows today's tasks grouped by campo with labour/status/operators.
- No fabricated data; `pnpm --filter backend test` and `next build` green.

## Progress log

- Implemented; pending verification and commit.
