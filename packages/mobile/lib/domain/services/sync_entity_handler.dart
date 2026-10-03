import '../models/sync_queue_item.dart';

/// Handler concreto de una entidad de la cola de sincronización.
///
/// El motor de sincronización no conoce entidades: despacha por `entity`
/// (string) a este contrato. El handler lanza [SyncRetriableException]
/// (5xx/red) o [SyncPermanentException] (4xx) para que el engine decida la
/// transición de la fila.
abstract class SyncEntityHandler {
  Future<void> handle(SyncQueueItem item);
}
