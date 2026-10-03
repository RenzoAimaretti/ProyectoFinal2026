import 'enums.dart';

/// Resumen de actividad de maquinaria para listados con nombre de máquina
/// resuelto (`MachineActivities ⋈ Machines`).
class MachineActivitySummary {
  const MachineActivitySummary({
    required this.id,
    required this.machineId,
    required this.machineName,
    required this.type,
    required this.date,
  });

  final String id;
  final String machineId;
  final String machineName;
  final MachineActivityType type;
  final DateTime date;
}
