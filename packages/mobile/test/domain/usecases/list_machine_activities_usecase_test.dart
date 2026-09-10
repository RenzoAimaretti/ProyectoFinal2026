import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/usecases/list_machine_activities_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeMachineActivityRepository activityRepo;
  late ListMachineActivitiesUseCase sut;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    sut = ListMachineActivitiesUseCase(activityRepo);
  });

  final activity = MachineActivity(
    machineId: 'm-1',
    type: MachineActivityType.FUEL,
    date: DateTime(2026, 6, 15),
    liters: 50.0,
    companyId: 'company-1',
  );

  test('execute filtra por machineId', () async {
    await activityRepo.create(activity);

    final result = await sut.execute('m-1').first;
    expect(result, hasLength(1));

    final empty = await sut.execute('m-99').first;
    expect(empty, isEmpty);
  });

  test('watchAll devuelve todas las actividades', () async {
    await activityRepo.create(activity);

    final result = await sut.watchAll().first;
    expect(result, hasLength(1));
  });

  test('watchByCompany filtra por companyId', () async {
    await activityRepo.create(activity);

    final result = await sut.watchByCompany('company-1').first;
    expect(result, hasLength(1));

    final empty = await sut.watchByCompany('company-99').first;
    expect(empty, isEmpty);
  });

  test('watchByCompany con null devuelve todas', () async {
    await activityRepo.create(activity);

    final result = await sut.watchByCompany(null).first;
    expect(result, hasLength(1));
  });
}
