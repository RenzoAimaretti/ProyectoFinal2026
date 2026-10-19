import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/machine_tables.dart';

part 'machine_usages_dao.g.dart';

/// Lecturas de usos de maquinaria ligados a tarea (CUU08, R021).
@DriftAccessor(tables: [MachineUsages])
class MachineUsagesDao extends DatabaseAccessor<AppDatabase>
    with _$MachineUsagesDaoMixin {
  MachineUsagesDao(AppDatabase db) : super(db);

  Stream<List<MachineUsage>> watchByTask(String taskId) {
    return (select(machineUsages)
          ..where((t) => t.taskId.equals(taskId))
          ..orderBy([(t) => OrderingTerm.desc(t.workDate)]))
        .watch();
  }

  Stream<List<MachineUsage>> watchByMachine(String machineId) {
    return (select(machineUsages)
          ..where((t) => t.machineId.equals(machineId))
          ..orderBy([(t) => OrderingTerm.desc(t.workDate)]))
        .watch();
  }

  Stream<List<MachineUsage>> watchAll() {
    return (select(machineUsages)
          ..orderBy([(t) => OrderingTerm.desc(t.workDate)]))
        .watch();
  }

  Future<MachineUsage?> getById(String id) {
    return (select(machineUsages)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }
}
