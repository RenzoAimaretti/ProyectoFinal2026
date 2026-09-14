import 'dart:async';

import '../../domain/models/task.dart' as domain;
import '../../domain/repositories/task_reader.dart';
import '../models/task_mapper.dart';
import '../services/app_database.dart';

/// Lectura de tareas de labor en drift.
class DriftTaskReader implements TaskReader {
  DriftTaskReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Task>> watchAssignedTo(String operatorId) => _db.tasksDao
      .watchAssignedTo(operatorId)
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Stream<List<domain.Task>> watchAll() => _db.tasksDao
      .watchAll()
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Task?> getById(String id) async =>
      (await _db.tasksDao.getById(id))?.toDomain();
}
