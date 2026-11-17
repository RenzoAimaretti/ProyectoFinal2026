import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'catalog_tables.dart';
import 'task_tables.dart';

/// Maquinaria (CUU08). Tabla única con campos nullable según `type` (D3).
@TableIndex(
  name: 'idx_machine_activities_machine_date',
  columns: {#machineId, #date},
)
@DataClassName('MachineActivity')
class MachineActivities extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get machineId => text().references(Machines, #id)();
  TextColumn get type => text()();
  DateTimeColumn get date => dateTime()();
  RealColumn get liters => real().nullable()();
  TextColumn get receipt => text().nullable()();
  RealColumn get cost => real().nullable()();
  TextColumn get spareParts => text().nullable()();
  RealColumn get usageHours => real().nullable()();
  RealColumn get hectares => real().nullable()();
  TextColumn get companyId => text().nullable().references(Companies, #id)();
  TextColumn get observations => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Uso de maquinaria ligado a una tarea (CUU08, R021).
///
/// Es la fuente del uso en campo: `MachineActivities` conserva solo el
/// historial previo (combustible, mantenimiento, reparación y los `USO_CAMPO`
/// antiguos), que no se reescribe.
@TableIndex(name: 'idx_machine_usages_task_id', columns: {#taskId})
@TableIndex(name: 'idx_machine_usages_machine_id', columns: {#machineId})
@DataClassName('MachineUsage')
class MachineUsages extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get machineId => text().references(Machines, #id)();
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get operatorId => text()(); // userId del backend, sin FK local
  RealColumn get usageHours => real().nullable()();
  RealColumn get hectares => real().nullable()();
  DateTimeColumn get workDate => dateTime()();
  TextColumn get observations => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
