import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_activities_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/usecases/list_machine_history_usecase.dart';
import 'package:mobile/domain/usecases/list_machine_activities_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeMachineActivityRepository activityRepo;
  late FakeMachineUsageRepository usageRepo;
  late FakeMachineReader machineReader;
  late ListMachineActivitiesUseCase listUseCase;
  late MachineActivitiesViewModel sut;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    usageRepo = FakeMachineUsageRepository();
    machineReader = FakeMachineReader();
    listUseCase = ListMachineActivitiesUseCase(activityRepo);
    sut = MachineActivitiesViewModel(listUseCase,
      ListMachineHistoryUseCase(listUseCase, usageRepo, machineReader));
  });

  final activity = MachineActivity(
    machineId: 'm-1',
    type: MachineActivityType.FUEL,
    date: DateTime(2026, 6, 15),
    liters: 50.0,
    companyId: 'company-1',
  );

  test('activities devuelve todas las actividades sin firma', () async {
    await activityRepo.create(activity);

    final result = await sut.activities.first;
    expect(result, hasLength(1));
  });

  test('history preserves legacy activity and task usage as separate rows', () async {
    await activityRepo.create(activity);
    await usageRepo.create(MachineUsage(
      id: 'u1', machineId: 'm-1', taskId: 't1', operatorId: 'o1',
      workDate: DateTime(2026, 6, 16),
    ));
    machineReader.seed(Machine(
      id: 'm-1', companyId: 'company-1', name: 'Tractor',
      status: MachineStatus.ACTIVE, createdAt: DateTime(2026),
      updatedAt: DateTime(2026), version: 1, deleted: false,
    ));
    sut.setCompany('company-1');
    final rows = await sut.history.first;
    expect(rows, hasLength(2));
    expect(rows.first.isTaskUsage, isTrue);
    expect(rows.last.type, MachineActivityType.FUEL);
  });

  test('setCompany notifica listeners', () {
    var notified = false;
    sut.addListener(() => notified = true);

    sut.setCompany('company-1');

    expect(notified, isTrue);
    expect(sut.companyId, 'company-1');
  });

  test('setCompany con mismo valor no notifica', () {
    sut.setCompany('company-1');

    var notified = false;
    sut.addListener(() => notified = true);

    sut.setCompany('company-1');
    expect(notified, isFalse);
  });

  test('setCompany filtra por firma', () async {
    await activityRepo.create(activity);

    sut.setCompany('company-1');
    final result = await sut.activities.first;
    expect(result, hasLength(1));

    sut.setCompany('company-99');
    final empty = await sut.activities.first;
    expect(empty, isEmpty);
  });
}
