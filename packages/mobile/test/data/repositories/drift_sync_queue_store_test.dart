import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_sync_queue_store.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/enums.dart';

import 'drift_test_helper.dart';

/// 6.3 — adaptador drift del outbox: lifecycle, FIFO y recover.
void main() {
  late AppDatabase db;
  late DriftSyncQueueStore store;

  setUp(() {
    db = createTestDatabase();
    store = DriftSyncQueueStore(db);
  });

  tearDown(() => db.close());

  Future<void> seed({
    required String id,
    required String entity,
    required String entityId,
    String operation = 'CREATE',
    int attempts = 0,
    String status = 'PENDING',
    String? lastError,
    DateTime? createdAt,
  }) async {
    await db.into(db.syncQueue).insert(
          SyncQueueCompanion.insert(
            id: Value(id),
            entity: entity,
            entityId: entityId,
            operation: operation,
            status: Value(status),
            attempts: Value(attempts),
            lastError: Value.absentIfNull(lastError),
            createdAt: Value.absentIfNull(createdAt),
          ),
        );
  }

  test('nextPendingBatch: FIFO por createdAt asc y solo PENDING', () async {
    await seed(
        id: 'a', entity: 'DAILY_REPORT', entityId: 'r1',
        createdAt: DateTime(2026, 1, 1));
    await seed(
        id: 'b', entity: 'RECEPTION', entityId: 'r2',
        createdAt: DateTime(2026, 1, 2));
    await seed(
        id: 'c', entity: 'DAILY_REPORT', entityId: 'r3',
        status: 'FAILED', createdAt: DateTime(2025, 12, 31));

    final batch = await store.nextPendingBatch(limit: 10);

    expect(batch.map((i) => i.id), ['a', 'b']);
    expect(batch.first.operation, SyncOperation.CREATE);
    expect(batch.first.entityId, 'r1');
  });

  test('markDone borra la fila', () async {
    await seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1');

    await store.markProcessing('a');
    await store.markDone('a');

    final remaining = await db.select(db.syncQueue).get();
    expect(remaining, isEmpty);
  });

  test('requeue: PENDING + attempts+1 + lastError', () async {
    await seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1');

    await store.requeue('a', 'boom');

    final row = (await db.select(db.syncQueue).get()).single;
    expect(row.status, 'PENDING');
    expect(row.attempts, 1);
    expect(row.lastError, 'boom');
  });

  test('markFailed: FAILED + attempts+1 + lastError', () async {
    await seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1', attempts: 3);

    await store.markFailed('a', 'task not found');

    final row = (await db.select(db.syncQueue).get()).single;
    expect(row.status, 'FAILED');
    expect(row.attempts, 4);
    expect(row.lastError, 'task not found');
  });

  test('recoverInterrupted: PROCESSING → PENDING', () async {
    await seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1',
        status: 'PROCESSING');

    await store.recoverInterrupted();

    final row = (await db.select(db.syncQueue).get()).single;
    expect(row.status, 'PENDING');
  });
}
