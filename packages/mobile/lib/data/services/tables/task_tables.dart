import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'catalog_tables.dart';

/// Tareas de labor (CUU08). Solo lectura en el móvil: se pueblan por sync de
/// tareas (Sprint 2), NO por pull versionado, por eso no llevan
/// `version`/`deleted`.
@TableIndex(name: 'idx_tasks_lot_id', columns: {#lotId})
@TableIndex(name: 'idx_tasks_status', columns: {#status})
@DataClassName('Task')
class Tasks extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get lotId => text().references(Lots, #id)();
  TextColumn get laborTypeId => text().references(LaborTypes, #id)();
  TextColumn get status => text()(); // TaskStatus (enum name)
  DateTimeColumn get startedAt => dateTime().nullable()();
  DateTimeColumn get finishedAt => dateTime().nullable()();
  DateTimeColumn get updatedTaskAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Asignación de una tarea a un operario (many-to-many en el backend).
@TableIndex(name: 'idx_task_operators_task_id', columns: {#taskId})
@DataClassName('TaskOperator')
class TaskOperators extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get operatorId => text()(); // sin FK local (userId del backend)

  @override
  Set<Column> get primaryKey => {id};
}
