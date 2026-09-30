import 'dart:async';

import '../../domain/models/sync_queue_item.dart';
import '../../domain/repositories/sync_queue_repository.dart';
import '../models/enum_converters.dart';
import '../services/app_database.dart';

/// Implementación drift del puerto [SyncQueuePort] (outbox, Sprint 2).
class DriftSyncQueueStore implements SyncQueuePort {
  DriftSyncQueueStore(this._db);

  final AppDatabase _db;

  @override
  Future<List<SyncQueueItem>> nextPendingBatch({int limit = 10}) async {
    final rows = await _db.syncQueueDao.nextPendingBatch(limit: limit);
    return rows.map(_toItem).toList();
  }

  @override
  Future<void> markProcessing(String id) => _db.syncQueueDao.markProcessing(id);

  @override
  Future<void> markDone(String id) => _db.syncQueueDao.markDone(id);

  @override
  Future<void> requeue(String id, String lastError) =>
      _db.syncQueueDao.requeue(id, lastError);

  @override
  Future<void> markFailed(String id, String lastError) =>
      _db.syncQueueDao.markFailed(id, lastError);

  @override
  Future<void> recoverInterrupted() => _db.syncQueueDao.recoverInterrupted();

  SyncQueueItem _toItem(SyncQueueEntry row) => SyncQueueItem(
        id: row.id,
        entity: row.entity,
        entityId: row.entityId,
        operation: syncOperationFromText(row.operation),
        attempts: row.attempts,
      );
}
