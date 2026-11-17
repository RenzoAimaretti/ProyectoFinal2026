import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_usage_form_view_model.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/register_machine_usage_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeMachineUsageRepository repository;
  late FakeTaskReader taskReader;
  late FakeMachineReader machineReader;
  late MachineUsageFormViewModel viewModel;

  setUp(() {
    repository = FakeMachineUsageRepository();
    taskReader = FakeTaskReader()
      ..seed(const Task(
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.IN_PROGRESS,
      ));
    machineReader = FakeMachineReader()
      ..seed(Machine(
        id: 'machine-1',
        companyId: 'company-1',
        name: 'Tractor',
        status: MachineStatus.ACTIVE,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
    viewModel = MachineUsageFormViewModel(
      registerUseCase: RegisterMachineUsageUseCase(repository, taskReader),
      taskReader: taskReader,
      machineReader: machineReader,
      operatorId: 'operator-1',
      companyId: 'company-1',
    );
  });

  test('expone solo las tareas asignadas al operario de la sesión', () async {
    final tasks = await viewModel.assignedTasks.first;

    expect(tasks, hasLength(1));
    expect(tasks.single.id, 'task-1');
  });

  test('usa id corto si falta el nombre del lote aunque haya lectores', () async {
    final labors = FakeLaborTypeReader()
      ..seed(LaborType(
        id: 'labor-1', name: 'Siembra', createdAt: DateTime(2026),
        updatedAt: DateTime(2026), version: 1, deleted: false,
      ));
    final namedViewModel = MachineUsageFormViewModel(
      registerUseCase: RegisterMachineUsageUseCase(repository, taskReader),
      taskReader: taskReader,
      machineReader: machineReader,
      lotReader: FakeLotReader(),
      laborTypeReader: labors,
      operatorId: 'operator-1',
    );

    expect((await namedViewModel.taskOptions.first).single.label, 'Tarea task-1');
  });

  test('expone las máquinas de la firma activa', () async {
    final machines = await viewModel.machines.first;

    expect(machines, hasLength(1));
    expect(machines.single.id, 'machine-1');
  });

  test('registra el uso y apaga isSaving', () async {
    expect(viewModel.isSaving, isFalse);

    await viewModel.register(MachineUsage(
      taskId: 'task-1',
      machineId: 'machine-1',
      operatorId: viewModel.operatorId,
      usageHours: 2,
      workDate: DateTime(2026, 3, 8),
    ));

    expect(repository.usages, hasLength(1));
    expect(repository.usages.single.taskId, 'task-1');
    expect(viewModel.isSaving, isFalse);
  });

  test('actualiza el operario cuando se restaura la sesión', () {
    viewModel.setOperator('operator-2');

    expect(viewModel.operatorId, 'operator-2');
  });

  test('propaga el error del use case sin guardar', () async {
    await expectLater(
      viewModel.register(MachineUsage(
        taskId: 'task-1',
        machineId: 'machine-1',
        operatorId: 'operator-1',
        workDate: DateTime(2026, 3, 8),
      )),
      throwsA(anything),
    );

    expect(repository.usages, isEmpty);
    expect(viewModel.isSaving, isFalse);
  });
}
