import '../../domain/models/enums.dart';
import '../services/app_database.dart';

/// Entidades encoladas en `SyncQueue` (design §7).
///
/// Los valores son el nombre del recurso que el `SyncEngine` (Sprint 2)
/// reconstruirá y enviará al backend. Los ítems viajan embebidos en el padre,
/// por lo que solo se encola la entidad cabecera.
abstract final class SyncEntity {
  static const String dailyReport = 'DAILY_REPORT';
  static const String reception = 'RECEPTION';
  static const String machineActivity = 'MACHINE_ACTIVITY';
  static const String photo = 'PHOTO';
  static const String stock = 'STOCK';
}

/// Inserta una fila en `SyncQueue` dentro de la transacción ya abierta por el
/// adaptador drift que la invoca (D9: entidad + cola atómicos).
///
/// `status` y `attempts` quedan con los defaults de la columna (`PENDING` / 0).
Future<void> enqueueSync({
  required AppDatabase db,
  required String entity,
  required String entityId,
  SyncOperation operation = SyncOperation.CREATE,
}) {
  return db.into(db.syncQueue).insert(
        SyncQueueCompanion.insert(
          entity: entity,
          entityId: entityId,
          operation: operation.name,
        ),
      );
}
