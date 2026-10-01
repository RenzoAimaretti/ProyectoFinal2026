import '../../domain/models/task.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Mapper fila drift `Task` → modelo de dominio `Task`.
///
/// Las tareas son de SOLO LECTURA en el móvil (llegan por sync), por lo que
/// solo se provee `toDomain()`; no hay `fromDomain`.
extension TaskRowMapper on Task {
  domain.Task toDomain() => domain.Task(
        id: id,
        lotId: lotId,
        laborTypeId: laborTypeId,
        status: taskStatusFromText(status),
        startedAt: startedAt,
        finishedAt: finishedAt,
        updatedTaskAt: updatedTaskAt,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}
