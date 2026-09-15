# Delta Spec — Pulido Operario + Tareas (pre-Sprint 2)

**Change:** `sprint1-polish-operario-tareas`
**Alcance:** correcciones sobre la capa móvil del Sprint 1. El sync, la aprobación web y el backend siguen fuera de alcance (Sprint 2).

## MODIFIED Requirements

### Área 1 — Parte diario (CUU05)

#### Requirement: El parte nace de una Tarea (R007)
El móvil MUST exigir que todo parte diario referencie una `Task` (`DailyReport.taskId` obligatoria). Una misma tarea admite múltiples partes (1 tarea → N jornadas).

- **GIVEN** un operario con tareas asignadas
- **WHEN** carga un parte diario
- **THEN** el parte queda ligado a una tarea (asignada o no), con lote y labor heredados de ella.

#### Requirement: Fecha elegida por el operario (no `now()`)
El móvil MUST permitir que el operario elija la fecha del parte, con default hoy y **bloqueo de fechas futuras**.

- **GIVEN** un operario cargando un parte
- **WHEN** selecciona una fecha pasada o de hoy
- **THEN** el parte se registra con esa fecha.
- **WHEN** intenta seleccionar una fecha futura
- **THEN** el sistema la rechaza.

#### Requirement: Firma heredada del selector global
El móvil MUST asignar la firma (`companyId`) del parte desde el selector global de firma; el formulario ya no solicita firma.

- **GIVEN** una firma activa seleccionada en el dashboard
- **WHEN** el operario carga un parte
- **THEN** el parte queda asociado a esa firma sin pedirla de nuevo.

#### Requirement: Nombres resueltos en el listado
El móvil MUST mostrar en los listados los nombres de lote/labor (partes), cliente (recepciones) y máquina (maquinaria), resolviendo las FKs por JOIN en drift. No mostrar IDs crudos.

- **GIVEN** un parte diario listado
- **WHEN** el operario ve la bandeja
- **THEN** ve "Lote 1 · Pulverización", no el UUID del lote.

### Área 2 — Recepción de insumos (CUU06)

#### Requirement: Recepción en solo-lectura (sin validación en el móvil)
El móvil MUST eliminar la acción de validar recepciones: la validación es responsabilidad del administrador/contratista en el web. La bandeja móvil lista **todas** las recepciones (cualquier estado) en modo solo-lectura.

- **GIVEN** un operario en la pestaña Recepciones
- **WHEN** observa la lista
- **THEN** ve todas las recepciones con su estado, sin botón de validación.

#### Requirement: Sin KPI de stock en el móvil
El móvil MUST quitar el KPI "Insumos con stock" del dashboard (el stock local solo se poblará por sync en Sprint 2).

## Estados de validación (sin cambios)

| Entidad | Estados |
|---------|---------|
| `DailyReport` | `PENDING_APPROVAL` → `APPROVED` / `REJECTED` |
| `Reception` | `PENDING_VALIDATION` → `VALIDATED` / `REJECTED` |
| `Task` | `PENDING` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` (solo lectura en móvil) |

## Pendientes

- Poblar tareas por sync (Sprint 2). Hasta entonces, seed demo.
- Ingreso de stock real vía sync (Sprint 2). La validación de recepción vuelve en web.
