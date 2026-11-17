import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../domain/models/machine_usage.dart' as domain;
import '../../domain/repositories/machine_usage_repository.dart';
import '../models/machine_usage_mapper.dart';
import '../services/app_database.dart';
import 'sync_queue_writer.dart';

/// Persistencia de usos de maquinaria por tarea (CUU08, R021) en drift.
///
/// La fila local y el ítem de la cola se escriben en la misma transacción. El
/// `id` es el UUID estable que el backend usa para no duplicar horas al
/// reintentar la sincronización.
class DriftMachineUsageRepository implements MachineUsageRepository {
  DriftMachineUsageRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> create(domain.MachineUsage usage) {
    return _db.transaction(() async {
      final id = usage.id ?? const Uuid().v4();
      await _db
          .into(_db.machineUsages)
          .insert(usage.fromDomain(id: id));
      await enqueueSync(
        db: _db,
        entity: SyncEntity.machineUsage,
        entityId: id,
      );
    });
  }

  @override
  Stream<List<domain.MachineUsage>> watchByTask(String taskId) {
    return _db.machineUsagesDao
        .watchByTask(taskId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<domain.MachineUsage>> watchByMachine(String machineId) {
    return _db.machineUsagesDao
        .watchByMachine(machineId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<domain.MachineUsage>> watchAll() {
    return _db.machineUsagesDao
        .watchAll()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }
}
