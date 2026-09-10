import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_machine_activity_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftMachineActivityRepository sut;

  setUp(() async {
    db = createTestDatabase();
    sut = DriftMachineActivityRepository(db);

    // Insertar la firma (FK de Machines, que es FK de MachineActivities).
    await db.into(db.companies).insert(CompaniesCompanion.insert(
          id: Value('company-1'),
          name: 'Firma Test',
          cuit: '30-12345678-9',
        ));
    await db.into(db.machines).insert(MachinesCompanion.insert(
          id: Value('m-1'),
          companyId: 'company-1',
          name: 'Tractor JD 7815',
          status: MachineStatus.ACTIVE.name,
        ));
  });

  tearDown(() => db.close());

  test('create + watchAll: la actividad se refleja en el stream', () async {
    final activity = MachineActivity(
      machineId: 'm-1',
      type: MachineActivityType.FUEL,
      date: DateTime(2026, 6, 15),
      liters: 50.0,
      companyId: 'company-1',
    );

    await sut.create(activity);

    final result = await sut.watchAll().first;
    expect(result, hasLength(1));
    expect(result.first.machineId, 'm-1');
    expect(result.first.type, MachineActivityType.FUEL);
    expect(result.first.liters, 50.0);
  });

  test('watchByMachine filtra por machineId', () async {
    await sut.create(MachineActivity(
      machineId: 'm-1',
      type: MachineActivityType.FUEL,
      date: DateTime(2026, 6, 15),
      liters: 50.0,
      companyId: 'company-1',
    ));

    final result = await sut.watchByMachine('m-1').first;
    expect(result, hasLength(1));

    final empty = await sut.watchByMachine('m-99').first;
    expect(empty, isEmpty);
  });

  test('create encola en SyncQueue', () async {
    await sut.create(MachineActivity(
      machineId: 'm-1',
      type: MachineActivityType.MAINTENANCE,
      date: DateTime(2026, 6, 15),
      cost: 1500.0,
      spareParts: 'Filtros',
      companyId: 'company-1',
    ));

    final pendingCount = await db.syncQueueDao.watchPendingCount().first;
    expect(pendingCount, greaterThan(0));
  });
}
