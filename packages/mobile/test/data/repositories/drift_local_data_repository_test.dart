import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_local_data_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/catalog_seeder.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftLocalDataRepository repository;

  setUp(() async {
    db = createTestDatabase();
    repository = DriftLocalDataRepository(db);
    await CatalogSeeder.seedIfEmpty(db);
  });

  tearDown(() => db.close());

  Future<void> addPendingDailyReport(String id) async {
    final task = await (db.select(db.tasks)..limit(1)).getSingle();
    final company = await (db.select(db.companies)..limit(1)).getSingle();
    await db.into(db.dailyReports).insert(
          DailyReportsCompanion.insert(
            id: Value(id),
            operatorId: 'demo-operario',
            companyId: company.id,
            taskId: task.id,
            lotId: task.lotId,
            laborTypeId: task.laborTypeId,
            date: DateTime.utc(2026, 11, 3),
            hectares: 10,
            hours: 2,
            status: 'PENDING',
          ),
        );
    await db.into(db.syncQueue).insert(
          SyncQueueCompanion.insert(
            entity: 'DAILY_REPORT',
            entityId: id,
            operation: 'CREATE',
          ),
        );
  }

  Future<void> addSession() {
    return db.into(db.sessions).insert(
          SessionsCompanion.insert(
            userId: 'u1',
            email: 'a@b.com',
            fullName: 'A B',
            role: 'OPERARIO',
            token: 'tok',
            lastAccessedAt: DateTime.utc(2026, 11, 3),
          ),
        );
  }

  test('cuenta las filas del outbox que todavía no se enviaron', () async {
    expect(await repository.countPendingSync(), 0);

    await addPendingDailyReport('report-1');
    await addPendingDailyReport('report-2');

    expect(await repository.countPendingSync(), 2);
  });

  test('clearAll vacía catálogo, registros locales y outbox, sin tocar la sesión', () async {
    await addPendingDailyReport('report-1');
    await addSession();

    await repository.clearAll();

    for (final table in db.allTables) {
      final rows = await db.select(table).get();
      if (table.actualTableName == db.sessions.actualTableName) {
        expect(rows, hasLength(1), reason: 'la sesión la limpia SessionRepository');
      } else {
        expect(rows, isEmpty, reason: '${table.actualTableName} debería quedar vacía');
      }
    }
  });
}
