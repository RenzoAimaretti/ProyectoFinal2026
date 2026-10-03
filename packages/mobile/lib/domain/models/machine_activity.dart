import 'enums.dart';

/// Actividad sobre maquinaria (CUU08). Tabla única con campos nullable según
/// `type` (decisión D3); la validación por tipo vive en el use case.
class MachineActivity {
  const MachineActivity({
    this.id,
    required this.machineId,
    required this.type,
    required this.date,
    this.liters,
    this.receipt,
    this.cost,
    this.spareParts,
    this.usageHours,
    this.hectares,
    this.companyId,
    this.observations,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String machineId;
  final MachineActivityType type;
  final DateTime date;

  /// FUEL (R018).
  final double? liters;
  final String? receipt;

  /// MAINTENANCE / REPAIR (R020).
  final double? cost;
  final String? spareParts;

  /// FIELD_USAGE (R021).
  final double? usageHours;
  final double? hectares;

  /// Firma que asume el costo (R019, obligatorio para FUEL).
  final String? companyId;

  final String? observations;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}
