import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/tasks/tasks_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/list_assigned_tasks_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeTaskReader taskReader;
  late TasksViewModel sut;

  setUp(() {
    taskReader = FakeTaskReader();
    sut = TasksViewModel(
      ListAssignedTasksUseCase(taskReader),
      taskReader,
    );
  });

  test('watchAssignedTo expone las tareas del operario', () async {
    taskReader.seed(Task(
      id: 'task-1',
      lotId: 'lot-1',
      laborTypeId: 'labor-1',
      status: TaskStatus.PENDING,
    ));

    final result = await sut.watchAssignedTo('op-1').first;
    expect(result, hasLength(1));
    expect(result.first.id, 'task-1');
  });

  test('watchAll expone todas las tareas (acceso A4)', () async {
    taskReader.seed(Task(
      id: 'task-1',
      lotId: 'lot-1',
      laborTypeId: 'labor-1',
      status: TaskStatus.PENDING,
    ));
    taskReader.seed(Task(
      id: 'task-2',
      lotId: 'lot-2',
      laborTypeId: 'labor-1',
      status: TaskStatus.COMPLETED,
    ));

    final result = await sut.watchAll().first;
    expect(result, hasLength(2));
  });
}
