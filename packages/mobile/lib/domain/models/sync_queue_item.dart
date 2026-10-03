import 'enums.dart';

/// Fila de outbox leída por el motor de sincronización.
///
/// `id` es el id de la FILA de cola (no el id del registro drift); `entityId`
/// apunta al registro drift (`uuid` clientDefault) que el handler reconstruye
/// para enviarlo al backend.
class SyncQueueItem {
  const SyncQueueItem({
    required this.id,
    required this.entity,
    required this.entityId,
    required this.operation,
    required this.attempts,
  });

  final String id;
  final String entity;
  final String entityId;
  final SyncOperation operation;
  final int attempts;
}
