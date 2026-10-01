import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/usecases/register_machine_activity_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeMachineActivityRepository activityRepo;
  late RegisterMachineActivityUseCase sut;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    sut = RegisterMachineActivityUseCase(activityRepo);
  });

  final today = DateTime(2026, 6, 15);

  group('FUEL', () {
    test('válido: litros > 0 + companyId', () async {
      await sut.execute(MachineActivity(
        machineId: 'm-1',
        type: MachineActivityType.FUEL,
        date: today,
        liters: 50.0,
        companyId: 'company-1',
      ));

      // No error = success.
    });

    test('sin firma → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.FUEL,
          date: today,
          liters: 50.0,
          companyId: null,
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });

    test('litros ≤ 0 → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.FUEL,
          date: today,
          liters: 0,
          companyId: 'company-1',
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });
  });

  group('MAINTENANCE', () {
    test('válido: costo > 0 + descripción', () async {
      await sut.execute(MachineActivity(
        machineId: 'm-1',
        type: MachineActivityType.MAINTENANCE,
        date: today,
        cost: 1500.0,
        spareParts: 'Cambio de filtros',
      ));
    });

    test('sin descripción → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.MAINTENANCE,
          date: today,
          cost: 1500.0,
          spareParts: null,
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });

    test('costo ≤ 0 → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.MAINTENANCE,
          date: today,
          cost: 0,
          spareParts: 'Algo',
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });
  });

  group('REPAIR', () {
    test('válido: costo > 0 + descripción', () async {
      await sut.execute(MachineActivity(
        machineId: 'm-1',
        type: MachineActivityType.REPAIR,
        date: today,
        cost: 5000.0,
        spareParts: 'Reparación del motor',
      ));
    });
  });

  group('FIELD_USAGE', () {
    test('válido: horas > 0 + hectáreas > 0', () async {
      await sut.execute(MachineActivity(
        machineId: 'm-1',
        type: MachineActivityType.FIELD_USAGE,
        date: today,
        usageHours: 8.0,
        hectares: 50.0,
      ));
    });

    test('horas ≤ 0 → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.FIELD_USAGE,
          date: today,
          usageHours: 0,
          hectares: 50.0,
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });

    test('hectáreas ≤ 0 → InvalidMachineActivityException', () {
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.FIELD_USAGE,
          date: today,
          usageHours: 8.0,
          hectares: 0,
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });
  });

  group('validación general', () {
    test('fecha futura → InvalidMachineActivityException', () {
      final futureDate = DateTime.now().add(const Duration(days: 30));
      expect(
        () => sut.execute(MachineActivity(
          machineId: 'm-1',
          type: MachineActivityType.FUEL,
          date: futureDate,
          liters: 50.0,
          companyId: 'company-1',
        )),
        throwsA(isA<InvalidMachineActivityException>()),
      );
    });
  });
}
