import '../../domain/models/task.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Mapper fila drift `Task` → modelo de dominio `Task`.
///
/// Las tareas son de SOLO LECTURA en el móvil (llegan por el pull del catálogo
/// de campo), por lo que solo se provee `toDomain()`; no hay `fromDomain`.
/// Los nombres de lote y labor llegan resueltos por el JOIN del DAO.
extension TaskRowMapper on Task {
  domain.Task toDomain({String? lotName, String? laborTypeName}) =>
      domain.Task(
        id: id,
        lotId: lotId,
        laborTypeId: laborTypeId,
        status: taskStatusFromText(status),
        startedAt: startedAt,
        finishedAt: finishedAt,
        updatedTaskAt: updatedTaskAt,
        createdAt: createdAt,
        updatedAt: updatedAt,
        lotName: lotName,
        laborTypeName: laborTypeName,
      );
}
