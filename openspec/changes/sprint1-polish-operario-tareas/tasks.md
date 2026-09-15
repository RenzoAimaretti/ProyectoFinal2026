# Tasks — Pulido Operario + Tareas (pre-Sprint 2)

> Orden por dependencia: esquema → dominio → data → seed → UI → recepción → joins → tests. Base: `design.md` y `docs/hexagonal-conventions.md`.

## 1. Esquema drift (Tasks + taskId + migración)

- [x] 1.1 Crear `lib/data/services/tables/task_tables.dart`: `Tasks` + `TaskOperators` según design §2.1.
- [x] 1.2 Agregar `taskId` (FK → `Tasks.id`) a `DailyReports` en `production_tables.dart` (design §2.2).
- [x] 1.3 Registrar `Tasks`, `TaskOperators` en `@DriftDatabase(tables: [...])` y `TasksDao` en `daos: [...]` (`app_database.dart`).
- [x] 1.4 Migración `schemaVersion` 1 → 2 con `onUpgrade` (createTable tasks + taskOperators, addColumn dailyReports.taskId) (design §2.3).
- [x] 1.5 Correr `dart run build_runner build` y verificar codegen sin errores.

## 2. Dominio

- [x] 2.1 Agregar `TaskStatus { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }` en `enums.dart`.
- [x] 2.2 Crear `lib/domain/models/task.dart` (design §3.2).
- [x] 2.3 Agregar `taskId` (required) a `DailyReport` (design §3.3).
- [x] 2.4 Crear puerto `lib/domain/repositories/task_reader.dart` (design §3.4).
- [x] 2.5 Crear `ListAssignedTasksUseCase` (design §3.5).
- [x] 2.6 Modificar `CreateDailyReportUseCase`: recibe `taskId`, hereda `lotId`/`laborTypeId` de la tarea vía `TaskReader`, mantiene R009. Agregar `TaskNotFoundException` en `errors.dart`.

## 3. Data layer

- [x] 3.1 Crear `lib/data/services/daos/tasks_dao.dart` (`watchAssignedTo`, `watchAll`, `getById`) (design §4.1).
- [x] 3.2 Mapper de `Task` (fila drift ↔ dominio) en `lib/data/models/`.
- [x] 3.3 Crear `lib/data/repositories/drift_task_reader.dart` (design §4.4).
- [x] 3.4 `DriftDailyReportRepository`: persistir `taskId` en `create`.
- [x] 3.5 Agregar `watchSummaries()` con joins en `DailyReportsDao`, `ReceptionsDao`, `MachineActivitiesDao` (design §4.2) + row classes resumen.

## 4. Modelos resumen (joins)

- [x] 4.1 Crear `DailyReportSummary`, `ReceptionSummary`, `MachineActivitySummary` en `lib/domain/models/` (design §4.3).
- [x] 4.2 Mappers de las row classes resumen a los modelos de dominio.

## 5. Recepción solo-lectura (CUU06)

- [x] 5.1 Eliminar `ValidateReceptionUseCase` + su test.
- [x] 5.2 `ReceptionRepository`: eliminar `validateAndApplyStock`; reemplazar `watchPending` por `watchAll`.
- [x] 5.3 `DriftReceptionRepository`: implementar `watchAll`; quitar el incremento de stock.
- [x] 5.4 Reemplazar `ListPendingReceptionsUseCase` por `ListReceptionsUseCase` (watchAll).

## 6. Seed

- [x] 6.1 `CatalogSeeder._seedTasks()`: sembrar `Tasks` + `TaskOperators` (algunas asignadas a `demo-operario`, otras no), coherentes con lotes/recetas existentes (design §7).

## 7. UI — Tareas + wizard + fecha

- [ ] 7.1 Crear `app/tasks/tasks_view_model.dart` + `tasks_view.dart` (lista de asignadas + acceso a todas — A4).
- [ ] 7.2 Dashboard: agregar pestaña "Tareas" (índice 0), FAB de tareas abre carga del parte, quitar KPI de stock y stream `stock`.
- [ ] 7.3 `daily_report_form_view.dart`: recibir `Task` + `companyId` + `operatorId`; quitar firma/cascada; encabezado resumen de tarea; pasos Jornada → Insumos → Fotos+resumen.
- [ ] 7.4 `DateField` en el parte, default hoy, **bloquea fechas futuras** (C1).
- [ ] 7.5 `main.dart`: cablear `TaskReader`, `ListAssignedTasksUseCase`, `TasksViewModel`, y pasar `companyId` del selector global al form del parte.

## 8. UI — listados con nombres

- [ ] 8.1 `daily_reports_view.dart`: consumir `DailyReportSummary`, mostrar `lotName`/`laborName`.
- [ ] 8.2 `receptions_view.dart`: consumir `ReceptionSummary`, mostrar `clientName` + estado, sin botón "Validar".
- [ ] 8.3 `machine_activities_view.dart`: consumir `MachineActivitySummary`, mostrar `machineName`.

## 9. Tests

- [ ] 9.1 Unit: `ListAssignedTasksUseCase`, `CreateDailyReportUseCase` (taskId + hereda + R009 + tarea inexistente), `ListReceptionsUseCase`.
- [ ] 9.2 Adaptador: `TasksDao` (join asignadas), `DailyReports.taskId` persistencia, joins de resumen (`NativeDatabase.memory()`).
- [ ] 9.3 ViewModel: `TasksViewModel`, `DailyReportFormViewModel` (nueva firma), `ReceptionsViewModel` (solo lectura).
- [ ] 9.4 Widget: pantalla tareas, wizard simplificado (fecha no futura), recepciones solo-lectura.
- [ ] 9.5 Actualizar tests rotos (form del parte sin cascada, `ReceptionsViewModel` sin `validate`, KPI removido).
- [ ] 9.6 Import-boundary: `domain/**` sin imports de `drift`/`flutter`.

## 10. Contrato y verificación

- [ ] 10.1 Actualizar `openspec/changes/sprint1-flutter-ui-persistencia-local/contrato-esquema-prisma.md` con los deltas Prisma (design §5).
- [ ] 10.2 `flutter analyze` → 0 errores / 0 warnings.
- [ ] 10.3 `flutter test` → verde.

## Explicit Non-Goals

- [ ] No ejecutar `flutter build` (regla del workspace).
- [ ] No implementar el motor de sync (Sprint 2).
- [ ] No cambiar el `schema.prisma` del backend (solo documentar en el contrato).
