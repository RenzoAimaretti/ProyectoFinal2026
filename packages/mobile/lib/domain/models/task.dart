import 'enums.dart';

/// Tarea de labor (CUU08). Solo lectura en el móvil: llega por sync de tareas
/// (Sprint 2) y no se crea desde el dominio.
///
/// `id` es nullable porque en el alta la genera la base (drift). `lotId`,
/// `laborTypeId` y `status` son obligatorios; las fechas de inicio/fin y los
/// timestamps de sync son opcionales.
class Task {
  const Task({
    this.id,
    required this.lotId,
    required this.laborTypeId,
    required this.status,
    this.startedAt,
    this.finishedAt,
    this.updatedTaskAt,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String lotId;
  final String laborTypeId;
  final TaskStatus status;
  final DateTime? startedAt;
  final DateTime? finishedAt;
  final DateTime? updatedTaskAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}
