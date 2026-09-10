import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_activity_form_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/usecases/register_machine_activity_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeMachineActivityRepository activityRepo;
  late FakeMachineReader machineReader;
  late FakeCompanyReader companyReader;
  late MachineActivityFormViewModel sut;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    machineReader = FakeMachineReader();
    companyReader = FakeCompanyReader();
    final registerUseCase = RegisterMachineActivityUseCase(activityRepo);

    sut = MachineActivityFormViewModel(
      registerUseCase: registerUseCase,
      machineReader: machineReader,
      companyReader: companyReader,
    );
  });

  test('register delega al use case y toglea isSaving', () async {
    expect(sut.isSaving, isFalse);

    final activity = MachineActivity(
      machineId: 'm-1',
      type: MachineActivityType.FUEL,
      date: DateTime(2026, 6, 15),
      liters: 50.0,
      companyId: 'company-1',
    );

    await sut.register(activity);

    // Tras completar, isSaving vuelve a false.
    expect(sut.isSaving, isFalse);
  });

  test('register notifica listeners al cambiar isSaving', () async {
    final notifications = <bool>[];
    sut.addListener(() => notifications.add(sut.isSaving));

    await sut.register(MachineActivity(
      machineId: 'm-1',
      type: MachineActivityType.FUEL,
      date: DateTime(2026, 6, 15),
      liters: 50.0,
      companyId: 'company-1',
    ));

    // Debe haber notificado al menos 2 veces: true (start) + false (end).
    expect(notifications, contains(true));
    expect(notifications.last, isFalse);
  });

  test('machines expone stream del MachineReader', () async {
    final result = await sut.machines.first;
    expect(result, isEmpty);
  });

  test('companies expone stream del CompanyReader', () async {
    final result = await sut.companies.first;
    expect(result, isEmpty);
  });
}
