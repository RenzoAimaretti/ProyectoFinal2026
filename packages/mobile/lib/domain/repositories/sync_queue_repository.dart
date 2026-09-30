import 'dart:async';

import '../models/sync_queue_item.dart';

/// Puerto del outbox `SyncQueue` (Sprint 2).
///
/// El motor de sincronización drena las filas `PENDING` en FIFO y las
/// transiciona `PENDING → PROCESSING → DONE | FAILED`. Las filas `DONE` se
/// borran; las `FAILED` se conservan con `attempts+1` y `lastError`.
abstract class SyncQueuePort {
  /// Próximas filas `PENDING` en orden FIFO (`createdAt` ascendente).
  Future<List<SyncQueueItem>> nextPendingBatch({int limit});

  /// Marca una fila como `PROCESSING` antes de despacharla al handler.
  Future<void> markProcessing(String id);

  /// Éxito: transición `DONE` + borrado en una sola operación.
  Future<void> markDone(String id);

  /// Error retriable (5xx/red): vuelve a `PENDING` con `attempts+1` y
  /// `lastError`, para reintentar en el próximo intento.
  Future<void> requeue(String id, String lastError);

  /// Error permanente (4xx): conserva la fila con `attempts+1` y `lastError`
  /// (poison message, no se reintenta).
  Future<void> markFailed(String id, String lastError);

  /// Restaura filas `PROCESSING` huérfanas (crash a mitad de push) a `PENDING`.
  Future<void> recoverInterrupted();
}
