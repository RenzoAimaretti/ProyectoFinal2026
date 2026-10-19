import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/usecases/list_machine_activities_usecase.dart';
import 'package:mobile/domain/usecases/list_machine_history_usecase.dart';

import 'fakes.dart';

void main() {
  final day = DateTime(2026, 6, 15);
  Machine machine(String id, String company) => Machine(
        id: id,
        companyId: company,
        name: 'Tractor $id',
        status: MachineStatus.ACTIVE,
        createdAt: day,
        updatedAt: day,
        version: 1,
        deleted: false,
      );

  late FakeMachineActivityRepository activities;
  late FakeMachineUsageRepository usages;
  late FakeMachineReader machines;
  late ListMachineHistoryUseCase sut;

  setUp(() {
    activities = FakeMachineActivityRepository();
    usages = FakeMachineUsageRepository();
    machines = FakeMachineReader();
    machines.seed(machine('m1', 'c1'));
    machines.seed(machine('m2', 'c2'));
    sut = ListMachineHistoryUseCase(
      ListMachineActivitiesUseCase(activities), usages, machines,
    );
  });

  test('interleaves usage by work date with legacy activity by date', () async {
    await activities.create(MachineActivity(
      id: 'fuel', machineId: 'm1', companyId: 'c1',
      type: MachineActivityType.FUEL, date: day,
    ));
    await usages.create(MachineUsage(
      id: 'usage', machineId: 'm1', taskId: 'task', operatorId: 'operator',
      workDate: day.add(const Duration(days: 1)), usageHours: 2,
    ));
    await activities.create(MachineActivity(
      id: 'repair', machineId: 'm1', companyId: 'c1',
      type: MachineActivityType.REPAIR,
      date: day.add(const Duration(days: 2)),
    ));

    final rows = await sut.watchByCompany('c1').first;
    expect(rows.map((r) => r.id), ['repair', 'usage', 'fuel']);
    expect(rows[1].machineName, 'Tractor m1');
    expect(rows[1].isTaskUsage, isTrue);
    expect(rows[2].type, MachineActivityType.FUEL);
  });

  test('filters by machine company and deduplicates within each source', () async {
    final usage = MachineUsage(
      id: 'same', machineId: 'm1', taskId: 'task', operatorId: 'operator',
      workDate: day,
    );
    await usages.create(usage);
    await usages.create(usage);
    await usages.create(MachineUsage(
      id: 'other', machineId: 'm2', taskId: 'task', operatorId: 'operator',
      workDate: day,
    ));
    await activities.create(MachineActivity(
      id: 'same', machineId: 'm1', companyId: 'c1',
      type: MachineActivityType.FIELD_USAGE, date: day,
    ));

    final rows = await sut.watchByCompany('c1').first;
    expect(rows, hasLength(2));
    expect(rows.where((r) => r.isTaskUsage), hasLength(1));
    expect(rows.where((r) => !r.isTaskUsage), hasLength(1));
    expect((await sut.watchByCompany('c2').first).single.id, 'other');
    expect(await sut.watchByCompany(null).first, hasLength(3));
  });
}
