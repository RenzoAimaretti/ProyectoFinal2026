import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_usage_form_view.dart';
import 'package:mobile/app/machinery/machine_usage_form_view_model.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/register_machine_usage_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  final now = DateTime(2026, 1, 1);

  Future<void> pumpForm(WidgetTester tester, {bool withNames = false}) async {
    final tasks = FakeTaskReader()
      ..seed(const Task(
        id: 'task-long-identifier',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.IN_PROGRESS,
      ));
    final lots = FakeLotReader()
      ..seed(Lot(
        id: 'lot-1', farmId: 'farm-1', name: 'Lote 1', area: 5,
        active: true, createdAt: now, updatedAt: now, version: 1,
        deleted: false,
      ));
    final labors = FakeLaborTypeReader()
      ..seed(LaborType(
        id: 'labor-1', name: 'Siembra', createdAt: now,
        updatedAt: now, version: 1, deleted: false,
      ));
    final viewModel = MachineUsageFormViewModel(
      registerUseCase: RegisterMachineUsageUseCase(
        FakeMachineUsageRepository(), tasks,
      ),
      taskReader: tasks,
      machineReader: FakeMachineReader(),
      lotReader: withNames ? lots : null,
      laborTypeReader: withNames ? labors : null,
      operatorId: 'operator-1',
    );
    await tester.pumpWidget(MaterialApp(
      home: MachineUsageFormView(viewModel: viewModel),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>).first);
    await tester.pumpAndSettle();
  }

  testWidgets('muestra labor y lote para una tarea del catálogo', (tester) async {
    await pumpForm(tester, withNames: true);
    expect(find.text('Siembra · Lote 1'), findsWidgets);
    expect(find.text('Tarea task-lon'), findsNothing);
    await tester.tap(find.text('Siembra · Lote 1').last);
    await tester.pumpAndSettle();
    expect(find.text('Siembra · Lote 1'), findsOneWidget);
  });

  testWidgets('conserva el identificador corto sin lectores de catálogo',
      (tester) async {
    await pumpForm(tester);
    expect(find.text('Tarea task-lon'), findsWidgets);
  });
}
