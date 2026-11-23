import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';

import '../../repositories/drift_test_helper.dart';

void main() {
  late AppDatabase db;

  setUp(() => db = createTestDatabase());
  tearDown(() => db.close());

  Future<String> enqueue(String entityId) async {
    final row = await db.into(db.syncQueue).insertReturning(
          SyncQueueCompanion.insert(
            entity: 'DAILY_REPORT',
            entityId: entityId,
            operation: 'CREATE',
          ),
        );
    return row.id;
  }

  test('watchQueuedCount cuenta todas las filas del outbox, sin importar el estado',
      () async {
    expect(await db.syncQueueDao.watchQueuedCount().first, 0);

    final first = await enqueue('report-1');
    final second = await enqueue('report-2');
    await enqueue('report-3');
    await db.syncQueueDao.markProcessing(first);
    await db.syncQueueDao.markFailed(second, 'rechazado');

    expect(await db.syncQueueDao.watchQueuedCount().first, 3);
  });

  test('un reintento no cambia el total; un envío exitoso lo baja', () async {
    final id = await enqueue('report-1');

    await db.syncQueueDao.markProcessing(id);
    await db.syncQueueDao.requeue(id, 'sin red');
    expect(await db.syncQueueDao.watchQueuedCount().first, 1);

    await db.syncQueueDao.markDone(id);
    expect(await db.syncQueueDao.watchQueuedCount().first, 0);
  });
}
