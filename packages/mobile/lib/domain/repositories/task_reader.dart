import 'dart:async';

import '../models/task.dart';

/// Lectura de tareas de labor (solo lectura en el móvil).
abstract interface class TaskReader {
  Stream<List<Task>> watchAssignedTo(String operatorId);

  Stream<List<Task>> watchAll();

  Future<Task?> getById(String id);
}
