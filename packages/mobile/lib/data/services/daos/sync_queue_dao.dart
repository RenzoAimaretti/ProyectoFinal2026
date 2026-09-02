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
}
