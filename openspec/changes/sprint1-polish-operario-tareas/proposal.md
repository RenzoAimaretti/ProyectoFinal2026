# Proposal — Pulido Operario + Tareas (pre-Sprint 2)

## Intent

Corregir la capa móvil del Sprint 1 para que sea **operable por un operario a campo**, antes de arrancar el motor de sync (Sprint 2). Cambios: introducir el concepto de **Tareas asignadas** como entrada del parte diario (CUU05), sacar la validación de recepción del móvil (CUU06), permitir elegir la fecha del parte, resolver nombres en los listados (joins) y heredar la firma del selector global.

## Scope

Responsable: **Ignacio — Dev 1 (Mobile & Sync)**.

Casos de uso impactados:

| CUU | Cambio |
|-----|--------|
| CUU00 | Sin cambio de flujo (login + restauración ya resueltos). |
| CUU05 | El parte diario nace de una **Tarea** (asignada o no). Fecha elegible por el operario. |
| CUU06 | La recepción pasa a **solo-lectura** en el móvil (sin botón "Validar"). |
| CUU08 | Sin cambio de flujo; solo resolver nombre de máquina en el listado. |

**Fuera de alcance:** motor de sync (Sprint 2), aprobación/rechazo en web (Sprint 2), cambios al `schema.prisma` del backend (se documentan en `contrato-esquema-prisma.md`).

## Approach

- **Tareas**: tabla local `Tasks` + `TaskOperators` (espejo del backend `Task` / `Task.operators`). El parte diario agrega `taskId` obligatorio (1 tarea → N partes). El móvil **nunca** escribe el estado de la tarea (lo maneja el admin en web).
- **Denormalización**: el parte **copia** `lotId` + `laborTypeId` + `companyId` al crearse (snapshot histórico inmutable), y la `taskId` queda como vínculo de trazabilidad.
- **Recepción**: se elimina `ValidateReceptionUseCase` + `validateAndApplyStock`; la lista muestra **todas** las recepciones en solo-lectura. Se saca el KPI "Insumos con stock".
- **Fecha**: `DateField` en el parte, default hoy, **bloquea fechas futuras**.
- **Nombres**: joins en drift para resolver `lotName`/`laborName` (partes), `clientName` (recepciones), `machineName` (maquinaria).
- **Firma**: el parte hereda `companyId` del selector global; se elimina el dropdown de firma del wizard.

## Decisions

1. `DailyReport.taskId → Task` **obligatorio**; una tarea admite múltiples partes (varias jornadas).
2. El operario puede cargar parte sobre una tarea **no asignada** (A4): la lista "mis tareas" es el flujo normal, pero se puede elegir cualquier tarea.
3. El estado de la tarea es **solo lectura** en el móvil.
4. El parte **denormaliza** lote/labor/firma (snapshot), no los hereda por join.
5. `TaskOperators.operatorId` sin FK local (es `userId` del backend; no hay tabla Users local).

## Risks

- **Móvil sin sync = cáscara vacía**: las tareas solo existen por seed demo hasta que el sync las pueble (Sprint 2). Coincide con el CUU05 ("tareas asignadas"), pero refuerza que la operatividad real depende del sync.

## Artifacts

- `design.md`
- `spec.md`
- `tasks.md`
- Actualización de `contrato-esquema-prisma.md` (deltas de BD Prisma).
