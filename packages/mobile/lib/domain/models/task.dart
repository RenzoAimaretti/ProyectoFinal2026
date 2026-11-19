import 'enums.dart';

/// Tarea de labor (CUU08). Solo lectura en el móvil: llega por el pull del
/// catálogo de campo y no se crea desde el dominio.
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
    this.lotName,
    this.laborTypeName,
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

  /// Nombres resueltos para mostrar (opcionales: `null` si no se resolvieron).
  final String? lotName;
  final String? laborTypeName;

  /// Etiqueta legible "Labor · Lote". Sin nombres cae a un id corto, nunca al
  /// UUID completo.
  String get displayLabel {
    final parts = [
      for (final name in [laborTypeName, lotName])
        if (name != null && name.trim().isNotEmpty) name.trim(),
    ];
    if (parts.isNotEmpty) return parts.join(' · ');
    final taskId = id;
    if (taskId == null || taskId.isEmpty) return 'Tarea';
    return 'Tarea ${taskId.length > 8 ? taskId.substring(0, 8) : taskId}';
  }
}
