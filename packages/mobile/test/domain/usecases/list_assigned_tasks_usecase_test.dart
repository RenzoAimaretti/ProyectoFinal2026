import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/list_assigned_tasks_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeTaskReader taskReader;
  late ListAssignedTasksUseCase sut;

  setUp(() {
    taskReader = FakeTaskReader();
    sut = ListAssignedTasksUseCase(taskReader);
  });

  test('execute delega a watchAssignedTo del TaskReader', () async {
    taskReader.seed(Task(
      id: 'task-1',
      lotId: 'lot-1',
      laborTypeId: 'labor-1',
      status: TaskStatus.PENDING,
    ));

    final result = await sut.execute('op-1').first;
    expect(result, hasLength(1));
    expect(result.first.id, 'task-1');
  });

  test('sin tareas asignadas el stream está vacío', () async {
    final result = await sut.execute('op-1').first;
    expect(result, isEmpty);
  });
}
