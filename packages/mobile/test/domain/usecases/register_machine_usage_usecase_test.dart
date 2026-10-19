import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/register_machine_usage_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeMachineUsageRepository repository;
  late FakeTaskReader taskReader;
  late RegisterMachineUsageUseCase useCase;

  setUp(() {
    repository = FakeMachineUsageRepository();
    taskReader = FakeTaskReader()
      ..seed(const Task(
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.IN_PROGRESS,
      ));
    useCase = RegisterMachineUsageUseCase(repository, taskReader);
  });

  MachineUsage usage({
    String taskId = 'task-1',
    double? hours = 2,
    double? hectares = 7,
    DateTime? workDate,
    String? observations,
  }) {
    return MachineUsage(
      machineId: 'machine-1',
      taskId: taskId,
      operatorId: 'operator-1',
      usageHours: hours,
      hectares: hectares,
      workDate: workDate ?? DateTime(2026, 3, 8),
      observations: observations,
    );
  }

  test('stores task-linked hours, hectares, work date and notes', () async {
    await useCase.execute(usage(observations: '  Turno noche  '));

    expect(repository.usages, hasLength(1));
    final stored = repository.usages.single;
    expect(stored.taskId, 'task-1');
    expect(stored.machineId, 'machine-1');
    expect(stored.operatorId, 'operator-1');
    expect(stored.usageHours, 2);
    expect(stored.hectares, 7);
    expect(stored.workDate, DateTime(2026, 3, 8));
    expect(stored.observations, 'Turno noche');
  });

  test('requires a task because all field usage belongs to one', () async {
    await expectLater(
      useCase.execute(usage(taskId: '  ')),
      throwsA(isA<InvalidMachineUsageException>()),
    );
    expect(repository.usages, isEmpty);
  });

  test('requires at least one positive measurement', () async {
    await expectLater(
      useCase.execute(usage(hours: null, hectares: null)),
      throwsA(isA<InvalidMachineUsageException>()),
    );
    await expectLater(
      useCase.execute(usage(hours: 0, hectares: 0)),
      throwsA(isA<InvalidMachineUsageException>()),
    );
    expect(repository.usages, isEmpty);
  });

  test('rejects a future work date without writing', () async {
    final tomorrow = DateTime.now().add(const Duration(days: 1));

    await expectLater(
      useCase.execute(usage(workDate: tomorrow)),
      throwsA(isA<InvalidMachineUsageException>()),
    );
    expect(repository.usages, isEmpty);
  });

  test('rejects notes longer than the backend accepts', () async {
    await expectLater(
      useCase.execute(usage(observations: 'x' * 1001)),
      throwsA(isA<InvalidMachineUsageException>()),
    );
    expect(repository.usages, isEmpty);
  });
}
