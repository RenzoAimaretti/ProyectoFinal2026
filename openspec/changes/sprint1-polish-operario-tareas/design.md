# Design: Pulido Operario + Tareas (pre-Sprint 2)

## 1. Enfoque

Continúa la arquitectura hexagonal del móvil (design sprint1): `domain/` puro ← `data/` (drift) ← `app/` (ViewModels + vistas). Todo cambio de BD local se ejecuta en drift; todo delta de BD del backend se **documenta** en `contrato-esquema-prisma.md` (no se ejecuta acá).

## 2. Esquema drift local (cambios)

### 2.1 Tablas nuevas — `data/services/tables/task_tables.dart`

```dart
@TableIndex(name: 'idx_tasks_lot_id', columns: {#lotId})
@TableIndex(name: 'idx_tasks_status', columns: {#status})
@DataClassName('Task')
class Tasks extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get lotId => text().references(Lots, #id)();
  TextColumn get laborTypeId => text().references(LaborTypes, #id)();
  TextColumn get status => text()();  // TaskStatus (enum name)
  DateTimeColumn get startedAt => dateTime().nullable()();
  DateTimeColumn get finishedAt => dateTime().nullable()();
  DateTimeColumn get updatedTaskAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('TaskOperator')
class TaskOperators extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get operatorId => text()(); // sin FK local (userId del backend)

  @override
  Set<Column> get primaryKey => {id};
}
```

> `Tasks` **no** lleva `version`/`deleted` (no es catálogo estático; se puebla por sync de tareas, no por pull versionado). El pedido de `version`/`deleted` sobre `Task` es **solo backend** (ver §5).

### 2.2 Columna nueva — `DailyReports.taskId`

En `data/services/tables/production_tables.dart`, dentro de `DailyReports`:

```dart
TextColumn get taskId => text().references(Tasks, #id)();
```

`DailyReports` mantiene `lotId`, `laborTypeId`, `companyId` (denormalizados, snapshot al crear el parte).

### 2.3 Migración — schemaVersion 1 → 2

`data/services/app_database.dart`:

```dart
@override
int get schemaVersion => 2;

@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (m) => m.createAll(),
  onUpgrade: (m, from, to) async {
    if (from < 2) {
      await m.createTable(tasks);
      await m.createTable(taskOperators);
      await m.addColumn(dailyReports, dailyReports.taskId);
    }
  },
  beforeOpen: (details) async {
    await customStatement('PRAGMA foreign_keys = ON');
  },
);
```

Registrar `Tasks`, `TaskOperators` en `@DriftDatabase(tables: [...])` y `TasksDao` en `daos: [...]`.

## 3. Dominio (cambios)

### 3.1 Enum — `domain/models/enums.dart`

```dart
enum TaskStatus {
  PENDING,
  IN_PROGRESS,
  COMPLETED,
  CANCELLED,
}
```

### 3.2 Modelo — `domain/models/task.dart`

```dart
class Task {
  const Task({
    this.id,
    required this.lotId,
    required this.laborTypeId,
    required this.status,
    this.startedAt,
    this.finishedAt,
    this.updatedTaskAt,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String lotId;
  final String laborTypeId;
  final TaskStatus status;
  final DateTime? startedAt;
  final DateTime? finishedAt;
  final DateTime? updatedTaskAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}
```

### 3.3 Modelo — `DailyReport` agrega `taskId`

`domain/models/daily_report.dart`: agregar `final String taskId;` (required). Los constructores/llamadas existentes se actualizan.

### 3.4 Puerto — `domain/repositories/task_reader.dart`

```dart
abstract interface class TaskReader {
  Stream<List<Task>> watchAssignedTo(String operatorId);
  Stream<List<Task>> watchAll();
  Future<Task?> getById(String id);
}
```

### 3.5 Use cases

- **`ListAssignedTasksUseCase`** (nuevo): `Stream<List<Task>> execute(String operatorId)` → `TaskReader.watchAssignedTo`.
- **`CreateDailyReportUseCase`** (modificado): recibe `taskId` (en vez de `lotId`/`laborTypeId`); lee la tarea vía `TaskReader.getById` y **hereda** `lotId`/`laborTypeId` de ella; `companyId` llega por parámetro (selector global). Mantiene validación R009 (receta previa), hectáreas/horas > 0, items > 0. Si la tarea no existe → `TaskNotFoundException`.

## 4. Data layer (cambios)

### 4.1 DAO — `data/services/daos/tasks_dao.dart`

- `watchAssignedTo(operatorId)`: join `Tasks ⋈ TaskOperators` filtrando por `operatorId`.
- `watchAll()`: todas las tareas (A4).
- `getById(id)`.

### 4.2 Joins de nombres (D2) — en DAOs existentes

Nuevas queries que devuelven filas con nombre resuelto (join):

| DAO | Query | Join | Campos extra |
|-----|-------|------|--------------|
| `DailyReportsDao` | `watchSummaries()` | `DailyReports ⋈ Lots ⋈ LaborTypes` | `lotName`, `laborName` |
| `ReceptionsDao` | `watchSummaries()` | `Receptions ⋈ Clients` | `clientName` |
| `MachineActivitiesDao` | `watchSummaries()` | `MachineActivities ⋈ Machines` | `machineName` |

Cada query define una row class propia (con `@DataClassName`, ej. `DailyReportSummary`).

### 4.3 Modelos resumen — `domain/models/`

- `DailyReportSummary`: `id`, `lotId`, `lotName`, `laborName`, `date`, `hectares`, `status`.
- `ReceptionSummary`: `id`, `clientId`, `clientName`, `date`, `status`.
- `MachineActivitySummary`: `id`, `machineId`, `machineName`, `type`, `date`.

### 4.4 Repositorios

- **`DriftTaskReader`** (nuevo): implementa `TaskReader` con `TasksDao`.
- **`DriftDailyReportRepository`**: `create` persiste `taskId`; nuevo `watchSummaries()` (o un reader dedicado) que mapea las filas join a `DailyReportSummary`.
- **`DriftReceptionRepository`**: **eliminar** `validateAndApplyStock`; agregar `watchAll()` (todas las recepciones) → reemplaza `watchPending`.
- **`DriftMachineActivityRepository`**: agregar `watchSummaries()`.

### 4.5 Eliminaciones (CUU06)

- Eliminar `ValidateReceptionUseCase` y su test.
- Eliminar `ListPendingReceptionsUseCase` → reemplazar por `ListReceptionsUseCase` (watchAll).
- `StockRepository.upsertIncrement` queda (lo usará el sync), sin consumidor local por ahora.

## 5. Deltas Prisma (documentados en `contrato-esquema-prisma.md`, NO se ejecutan)

1. `DailyReport.taskId String` + `task Task @relation(...)` + `Task.dailyReports DailyReport[]` (1:N).
2. `Task` gana `version Int @default(1)` + `deleted Boolean @default(false)` (consistencia soft-delete).
3. Mapeo: `Task.taskTypeId` (backend) ↔ `LaborType` (móvil); `TaskOperators` ↔ `Task.operators` (many-to-many).
4. `Task` **no** necesita `companyId` (firma del parte se resuelve por selector global).

## 6. UI (cambios)

### 6.1 Dashboard — `app/home/dashboard_view.dart`

- Nueva pestaña **"Tareas"** (primera, índice 0). Bottom nav: Tareas · Partes · Recepciones · Maquinaria.
- FAB de "Tareas" abre el flujo de carga del parte (selección de tarea).
- **Quitar** KPI "Insumos con stock" (`_buildStockKpi`) y el stream `stock`.

### 6.2 Tareas — `app/tasks/` (nuevo)

- `tasks_view_model.dart`: `Stream<List<Task>>` de las asignadas al operario + acceso a "todas" (A4).
- `tasks_view.dart`: lista de tareas asignadas con estado; botón "Cargar sobre otra tarea" (A4) abre selector de todas.

### 6.3 Parte diario — `app/reports/daily_report_form_view.dart`

- El form **recibe una `Task`** (y `companyId` del selector global + `operatorId`). Ya **no** tiene: dropdown de firma, cascada cliente→campo→lote→labor. Muestra un encabezado resumen (lote + labor, solo lectura).
- Pasos: (1) Jornada (fecha + hectáreas + horas), (2) Insumos, (3) Fotos + resumen.
- **Fecha**: `DateField` default hoy, **bloquea fechas futuras** (C1).
- El guardado llama a `CreateDailyReportUseCase` con `taskId` + `companyId` + `date` + `hectares` + `hours` + `items`.

### 6.4 Recepción — `app/receptions/receptions_view.dart`

- Lista **todas** las recepciones (`watchAll`) en solo-lectura, mostrando `clientName` + estado (`StatusBadge`).
- Eliminar botón "Validar", `ReceptionsViewModel.validate`, `operatorId`.

### 6.5 Listados con nombres

- `daily_reports_view.dart`, `receptions_view.dart`, `machine_activities_view.dart` consumen los modelos resumen y muestran nombres, no IDs.

## 7. Seed — `data/services/catalog_seeder.dart`

Agregar `_seedTasks()`: siembra `Tasks` + `TaskOperators` coherentes con lotes/recetas ya existentes. Algunas tareas asignadas a `demo-operario`, otras sin asignar (para cubrir A4).

## 8. Testing

| Capa | Qué |
|------|-----|
| Unit | `ListAssignedTasksUseCase`, `CreateDailyReportUseCase` (taskId + hereda + R009), recepción sin validación. |
| Adaptador | `TasksDao` join, `DailyReports.taskId` persistencia, joins de resumen. |
| ViewModel | `TasksViewModel`, `DailyReportFormViewModel` (nueva firma), `ReceptionsViewModel` (solo lectura). |
| Widget | pantalla tareas, wizard simplificado (fecha no futura), recepciones solo-lectura. |

Verificación: `flutter analyze` (0 errores) + `flutter test`. **No** `flutter build` (regla del workspace).

## 9. Preguntas resueltas

- Denormalización de lote/labor/firma en el parte: **sí** (snapshot histórico).
- Acceso a tareas no asignadas (A4): pestaña "Tareas" con opción de ver todas.
