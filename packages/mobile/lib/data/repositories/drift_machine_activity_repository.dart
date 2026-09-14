import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../domain/models/machine_activity.dart' as domain;
import '../../domain/models/machine_activity_summary.dart';
import '../../domain/repositories/machine_activity_repository.dart';
import '../models/machine_activity_mapper.dart';
import '../models/machine_activity_summary_mapper.dart';
import '../services/app_database.dart';
import 'sync_queue_writer.dart';

/// Persistencia de actividades de maquinaria (CUU08) en drift.
class DriftMachineActivityRepository implements MachineActivityRepository {
  DriftMachineActivityRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> create(domain.MachineActivity activity) {
    return _db.transaction(() async {
      final id = activity.id ?? const Uuid().v4();
      await _db
          .into(_db.machineActivities)
          .insert(activity.fromDomain(id: id));
      await enqueueSync(
        db: _db,
        entity: SyncEntity.machineActivity,
        entityId: id,
      );
    });
  }

  @override
  Stream<List<domain.MachineActivity>> watchByMachine(
    String machineId, {
    DateTime? from,
    DateTime? to,
  }) {
    return _db.machineActivitiesDao
        .watchByMachine(machineId, from: from, to: to)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<domain.MachineActivity>> watchByCompany(String companyId) {
    return _db.machineActivitiesDao
        .watchByCompany(companyId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<domain.MachineActivity>> watchAll() {
    return _db.machineActivitiesDao
        .watchAll()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<MachineActivitySummary>> watchSummaries({String? companyId}) {
    return _db.machineActivitiesDao
        .watchSummaries(companyId: companyId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }
}
