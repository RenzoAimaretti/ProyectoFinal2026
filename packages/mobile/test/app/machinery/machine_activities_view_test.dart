import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_activities_view.dart';
import 'package:mobile/app/machinery/machine_activities_view_model.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/usecases/list_machine_activities_usecase.dart';
import 'package:mobile/domain/usecases/list_machine_history_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  testWidgets('shows task usage alongside existing activity labels', (tester) async {
    final day = DateTime(2026, 6, 15);
    final activities = FakeMachineActivityRepository();
    final usages = FakeMachineUsageRepository();
    final machines = FakeMachineReader();
    machines.seed(Machine(
      id: 'm1', companyId: 'c1', name: 'Tractor', status: MachineStatus.ACTIVE,
      createdAt: day, updatedAt: day, version: 1, deleted: false,
    ));
    for (final type in MachineActivityType.values) {
      await activities.create(MachineActivity(
        id: type.name, machineId: 'm1', companyId: 'c1',
        type: type, date: day,
      ));
    }
    await usages.create(MachineUsage(
      id: 'usage', machineId: 'm1', taskId: 't1', operatorId: 'o1',
      workDate: day.add(const Duration(days: 1)),
    ));
    final list = ListMachineActivitiesUseCase(activities);
    final vm = MachineActivitiesViewModel(
      list, ListMachineHistoryUseCase(list, usages, machines),
    )..setCompany('c1');
    addTearDown(vm.dispose);
    await tester.pumpWidget(MaterialApp(home: Scaffold(
      body: MachineActivitiesView(viewModel: vm),
    )));
    await tester.pumpAndSettle();

    expect(find.textContaining('Uso por tarea'), findsOneWidget);
    expect(find.textContaining('Combustible'), findsOneWidget);
    expect(find.textContaining('Mantenimiento'), findsOneWidget);
    expect(find.textContaining('Reparación'), findsOneWidget);
    expect(find.textContaining('Uso en campo'), findsOneWidget);
    expect(find.text('Tractor'), findsOneWidget);
  });
}
