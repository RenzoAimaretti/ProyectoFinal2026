import 'package:drift/drift.dart' show Value;

import '../../domain/models/machine_usage.dart' as domain;
import '../services/app_database.dart';

/// Fila drift `MachineUsage` → modelo de dominio `MachineUsage`.
extension MachineUsageRowMapper on MachineUsage {
  domain.MachineUsage toDomain() => domain.MachineUsage(
        id: id,
        machineId: machineId,
        taskId: taskId,
        operatorId: operatorId,
        usageHours: usageHours,
        hectares: hectares,
        workDate: workDate,
        observations: observations,
        createdAt: createdAt,
      );
}

/// Modelo de dominio `MachineUsage` → companion drift para insertar.
extension MachineUsageDomainMapper on domain.MachineUsage {
  MachineUsagesCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return MachineUsagesCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      machineId: machineId,
      taskId: taskId,
      operatorId: operatorId,
      usageHours: Value.absentIfNull(usageHours),
      hectares: Value.absentIfNull(hectares),
      workDate: workDate,
      observations: Value.absentIfNull(observations),
      createdAt: Value.absentIfNull(createdAt),
    );
  }
}
