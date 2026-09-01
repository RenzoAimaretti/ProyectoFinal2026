import 'package:drift/drift.dart' show Value;

import '../../domain/models/machine_activity.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Fila drift `MachineActivity` → modelo de dominio `MachineActivity`.
extension MachineActivityRowMapper on MachineActivity {
  domain.MachineActivity toDomain() => domain.MachineActivity(
        id: id,
        machineId: machineId,
        type: machineActivityTypeFromText(type),
        date: date,
        liters: liters,
        receipt: receipt,
        cost: cost,
        spareParts: spareParts,
        usageHours: usageHours,
        hectares: hectares,
        companyId: companyId,
        observations: observations,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

/// Modelo de dominio `MachineActivity` → companion drift para insertar.
extension MachineActivityDomainMapper on domain.MachineActivity {
  MachineActivitiesCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return MachineActivitiesCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      machineId: machineId,
      type: machineActivityTypeToText(type),
      date: date,
      liters: Value.absentIfNull(liters),
      receipt: Value.absentIfNull(receipt),
      cost: Value.absentIfNull(cost),
      spareParts: Value.absentIfNull(spareParts),
      usageHours: Value.absentIfNull(usageHours),
      hectares: Value.absentIfNull(hectares),
      companyId: Value.absentIfNull(companyId),
      observations: Value.absentIfNull(observations),
      createdAt: Value.absentIfNull(createdAt),
      updatedAt: Value.absentIfNull(updatedAt),
    );
  }
}
