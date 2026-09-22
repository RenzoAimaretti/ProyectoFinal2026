import 'dart:async';

import '../../domain/models/task.dart';
import '../../domain/repositories/task_reader.dart';
import '../../domain/usecases/list_assigned_tasks_usecase.dart';

/// ViewModel de la pestaña Tareas (CUU08, lista).
///
/// Expone las tareas asignadas al operario vía [ListAssignedTasksUseCase] y el
/// acceso a TODAS las tareas vía [TaskReader.watchAll], necesario para el flujo
/// A4 "cargar sobre otra tarea" (una tarea no asignada).
class TasksViewModel {
  TasksViewModel(this._listAssignedUseCase, this._taskReader);

  final ListAssignedTasksUseCase _listAssignedUseCase;
  final TaskReader _taskReader;

  /// Tareas asignadas a [operatorId], ordenadas por fecha de creación desc.
  Stream<List<Task>> watchAssignedTo(String operatorId) =>
      _listAssignedUseCase.execute(operatorId);

  /// Todas las tareas (asignadas o no) para el selector A4.
  Stream<List<Task>> watchAll() => _taskReader.watchAll();
}
