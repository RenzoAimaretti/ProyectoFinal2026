import 'dart:async';

import '../models/task.dart';
import '../repositories/task_reader.dart';

/// Lista las tareas de labor asignadas a un operario.
class ListAssignedTasksUseCase {
  ListAssignedTasksUseCase(this._taskReader);

  final TaskReader _taskReader;

  Stream<List<Task>> execute(String operatorId) =>
      _taskReader.watchAssignedTo(operatorId);
}
