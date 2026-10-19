import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_machine_usage_repository.dart';
import 'package:mobile/data/services/app_database.dart' hide MachineUsage;
import 'package:mobile/domain/models/machine_usage.dart';

import '../../data/repositories/drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftMachineUsageRepository repository;

  setUp(() async {
    db = createTestDatabase();
    repository = DriftMachineUsageRepository(db);
    await _seedCatalog(db);
  });

  tearDown(() => db.close());

  MachineUsage usage({String? id}) => MachineUsage(
        id: id,
        machineId: 'machine-1',
        taskId: 'task-1',
        operatorId: 'operator-1',
        usageHours: 2,
        hectares: 7,
        workDate: DateTime(2026, 3, 8),
        observations: 'Turno noche',
      );

  test('persists the usage and enqueues exactly one push', () async {
    await repository.create(usage());

    final rows = await db.select(db.machineUsages).get();
    expect(rows, hasLength(1));
    final row = rows.single;
    expect(row.taskId, 'task-1');
    expect(row.workDate, DateTime(2026, 3, 8));
    expect(row.observations, 'Turno noche');

    final queue = await db.select(db.syncQueue).get();
    expect(queue, hasLength(1));
    expect(queue.single.entity, 'MACHINE_USAGE');
    expect(queue.single.entityId, row.id);
    expect(queue.single.status, 'PENDING');
  });

  test('exposes usage by task and keeps historical activities untouched', () async {
    await repository.create(usage());

    final byTask = await repository.watchByTask('task-1').first;
    expect(byTask, hasLength(1));
    expect(byTask.single.workDate, DateTime(2026, 3, 8));

    expect(await db.select(db.machineActivities).get(), isEmpty);
  });

  test('rejects a duplicate usage id without duplicating the queue', () async {
    await repository.create(usage(id: 'usage-1'));

    await expectLater(
      repository.create(usage(id: 'usage-1')),
      throwsA(anything),
    );

    expect(await db.select(db.machineUsages).get(), hasLength(1));
    expect(await db.select(db.syncQueue).get(), hasLength(1));
  });
}

/// Seeds the referenced company, machine and task, because foreign keys are
/// enforced at runtime (see `beforeOpen` in `AppDatabase`).
Future<void> _seedCatalog(AppDatabase db) async {
  await db.customStatement(
    "INSERT INTO companies (id, name, cuit, active, created_at, updated_at) "
    "VALUES ('company-1', 'Eliggi', '30-1-1', 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO labor_types (id, name, created_at, updated_at) "
    "VALUES ('labor-1', 'Siembra', 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO clients (id, name, active, created_at, updated_at) "
    "VALUES ('client-1', 'Cliente', 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO farms (id, client_id, name, surface, created_at, updated_at) "
    "VALUES ('farm-1', 'client-1', 'Campo', 100, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO lots (id, farm_id, name, area, active, created_at, updated_at) "
    "VALUES ('lot-1', 'farm-1', 'Lote', 50, 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO machines (id, company_id, name, status, created_at, updated_at) "
    "VALUES ('machine-1', 'company-1', 'Tractor', 'ACTIVE', 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO tasks (id, lot_id, labor_type_id, status, created_at, updated_at) "
    "VALUES ('task-1', 'lot-1', 'labor-1', 'PENDING', 0, 0)",
  );
}
