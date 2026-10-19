/// Uso de maquinaria ligado a una tarea (CUU08, R021).
///
/// Todo el uso en campo corresponde a una tarea: la fuente es esta entidad, no
/// una [MachineActivity] independiente. `workDate` conserva la fecha real del
/// trabajo y `observations` las notas capturadas en el campo.
class MachineUsage {
  const MachineUsage({
    this.id,
    required this.machineId,
    required this.taskId,
    required this.operatorId,
    this.usageHours,
    this.hectares,
    required this.workDate,
    this.observations,
    this.createdAt,
  });

  final String? id;
  final String machineId;
  final String taskId;
  final String operatorId;
  final double? usageHours;
  final double? hectares;
  final DateTime workDate;
  final String? observations;
  final DateTime? createdAt;
}
