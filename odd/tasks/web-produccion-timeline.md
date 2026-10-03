# Feature: Producción — daily task timeline + task creation

Turn the Producción page into a chronological timeline of the day's tasks and let
the admin create tasks and assign an operator.

## Why

Owner: "las tareas del día se vean como una línea de tiempo con la actividad, el
horario y el campo; colores según el estado (completada / en proceso / no
iniciada); y el admin debe poder crear tareas y asignarlas a un operario."

## Backend (already exists — no changes needed)

- `GET /tasks` -> enriched `{ id, lotId, lotName, farmName, taskTypeId,
  taskTypeName, status, startedAt, finishedAt, operators:[{id,name}] }`.
- `GET /lots`, `GET /farms` -> campo/lote cascade.
- `GET /task-types` -> labour catalogue.
- `GET /users` -> pick an `OPERARIO`.
- `POST /tasks` `{ lotId, taskTypeId, startedAt }`.
- `POST /tasks/:id/:operatorId` -> assign operator.

## Tasks

- [ ] P1 [web] Timeline of the day: chronological by `startedAt`, each entry shows
  hour, activity (`taskTypeName`), campo (`farmName`) + lote, status with
  colour, operators and duration when finished.
- [ ] P2 [web] Status colours via semantic tokens: FINALIZADA=success,
  EN_PROGRESO=info (live pulse), PENDIENTE=warning/slate ("no iniciada"),
  CANCELADA=danger/muted. Status legend + summary counts.
- [ ] P3 [web] Admin-only "Nueva tarea": modal with campo -> lote cascade, labour,
  date + time, operator (`OPERARIO`); on submit `POST /tasks` then
  `POST /tasks/:id/:operatorId`; toast + refetch.
- [ ] P4 [web] Date picker (default today), loading/empty/error states,
  responsive. Non-admin: create action hidden/disabled with a reason.
- [ ] V1 Verify: `next build` green (run by the orchestrator).

## Acceptance

- The page reads as a timeline with real data, correct colours and a legend.
- Admin can create a task and assign an operator end-to-end.
- No fabricated data; every control works or is disabled with a reason.

## Delivery

- Part of the visual/functional web work; push/PR = owner's call.

## Progress log

- Launched.
