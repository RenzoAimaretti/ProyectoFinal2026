import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/infra_tables.dart';

part 'sync_queue_dao.g.dart';

@DriftAccessor(tables: [SyncQueue])
class SyncQueueDao extends DatabaseAccessor<AppDatabase>
    with _$SyncQueueDaoMixin {
  SyncQueueDao(AppDatabase db) : super(db);

  Stream<List<SyncQueueEntry>> watchPendingSync() {
    return (select(syncQueue)
          ..where((t) => t.status.equals('PENDING'))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .watch();
  }

  /// Cantidad de filas `PENDING` (badge "pendientes de sincronización").
  Stream<int> watchPendingCount() {
    final countExp = syncQueue.id.count();
    return (selectOnly(syncQueue)
          ..addColumns([countExp])
          ..where(syncQueue.status.equals('PENDING')))
        .map((row) => row.read(countExp) ?? 0)
        .watchSingle();
  }

  // ─── Motor de sincronización (Sprint 2) ─────────────────────────────────────

  /// Próximas filas `PENDING` en orden FIFO (`createdAt` ascendente).
  Future<List<SyncQueueEntry>> nextPendingBatch({int limit = 10}) {
    return (select(syncQueue)
          ..where((t) => t.status.equals('PENDING'))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)])
          ..limit(limit))
        .get();
  }

  /// `PENDING → PROCESSING` antes de despachar al handler.
  Future<void> markProcessing(String id) {
    return (update(syncQueue)..where((t) => t.id.equals(id))).write(
          SyncQueueCompanion(
            status: const Value('PROCESSING'),
            updatedAt: Value(DateTime.now()),
          ),
        );
  }

  /// Éxito: transición `DONE` + borrado en una sola transacción (DONE es
  /// efímero, spec A2).
  Future<void> markDone(String id) {
    return transaction(() async {
      await (update(syncQueue)..where((t) => t.id.equals(id))).write(
            SyncQueueCompanion(
              status: const Value('DONE'),
              updatedAt: Value(DateTime.now()),
            ),
          );
      await (delete(syncQueue)..where((t) => t.id.equals(id))).go();
    });
  }

  /// Error retriable (5xx/red): `PENDING` + `attempts+1` + `lastError`.
  Future<void> requeue(String id, String lastError) {
    return transaction(() async {
      final row = await (select(syncQueue)..where((t) => t.id.equals(id)))
          .getSingleOrNull();
      if (row == null) return;
      await (update(syncQueue)..where((t) => t.id.equals(id))).write(
            SyncQueueCompanion(
              status: const Value('PENDING'),
              attempts: Value(row.attempts + 1),
              lastError: Value(lastError),
              updatedAt: Value(DateTime.now()),
            ),
          );
    });
  }

  /// Error permanente (4xx): conserva la fila con `attempts+1` y `lastError`.
  Future<void> markFailed(String id, String lastError) {
    return transaction(() async {
      final row = await (select(syncQueue)..where((t) => t.id.equals(id)))
          .getSingleOrNull();
      if (row == null) return;
      await (update(syncQueue)..where((t) => t.id.equals(id))).write(
            SyncQueueCompanion(
              status: const Value('FAILED'),
              attempts: Value(row.attempts + 1),
              lastError: Value(lastError),
              updatedAt: Value(DateTime.now()),
            ),
          );
    });
  }

  /// Restaura filas `PROCESSING` huérfanas (crash a mitad de push) a `PENDING`.
  Future<void> recoverInterrupted() {
    return (update(syncQueue)..where((t) => t.status.equals('PROCESSING')))
        .write(
          SyncQueueCompanion(
            status: const Value('PENDING'),
            updatedAt: Value(DateTime.now()),
          ),
        );
  }
}
