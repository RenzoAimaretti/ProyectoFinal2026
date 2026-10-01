import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_activities_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/usecases/list_machine_activities_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeMachineActivityRepository activityRepo;
  late ListMachineActivitiesUseCase listUseCase;
  late MachineActivitiesViewModel sut;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    listUseCase = ListMachineActivitiesUseCase(activityRepo);
    sut = MachineActivitiesViewModel(listUseCase);
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
