import 'enums.dart';

/// A single history row from one of two independent, preserved sources.
class MachineHistoryEntry {
  const MachineHistoryEntry({
    required this.id,
    required this.machineId,
    required this.machineName,
    required this.date,
    this.type,
  });

  final String id;
  final String machineId;
  final String machineName;
  final DateTime date;

  /// Null only for task-linked usage; legacy FIELD_USAGE retains its label.
  final MachineActivityType? type;
  bool get isTaskUsage => type == null;
}
