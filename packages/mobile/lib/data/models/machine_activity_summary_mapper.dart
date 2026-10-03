import '../../domain/models/machine_activity_summary.dart' as domain;
import '../services/daos/machine_activities_dao.dart';
import 'enum_converters.dart';

/// Fila de join `MachineActivitySummaryRow` → modelo `MachineActivitySummary`.
extension MachineActivitySummaryRowMapper on MachineActivitySummaryRow {
  domain.MachineActivitySummary toDomain() => domain.MachineActivitySummary(
        id: id,
        machineId: machineId,
        machineName: machineName,
        type: machineActivityTypeFromText(type),
        date: date,
      );
}
