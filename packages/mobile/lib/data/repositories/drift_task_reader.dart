import 'dart:async';

import '../../domain/models/task.dart' as domain;
import '../../domain/repositories/task_reader.dart';
import '../models/task_mapper.dart';
import '../services/app_database.dart';
import '../services/daos/tasks_dao.dart';

/// Lectura de tareas de labor en drift.
class DriftTaskReader implements TaskReader {
  DriftTaskReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Task>> watchAssignedTo(String operatorId) =>
      _db.tasksDao.watchAssignedTo(operatorId).map(_toDomain);

  @override
  Stream<List<domain.Task>> watchAll() =>
      _db.tasksDao.watchAll().map(_toDomain);

  @override
  Future<domain.Task?> getById(String id) async {
    final row = await _db.tasksDao.getByIdWithNames(id);
    return row?.task.toDomain(
      lotName: row.lotName,
      laborTypeName: row.laborTypeName,
    );
  }

  List<domain.Task> _toDomain(List<TaskWithNames> rows) => [
        for (final row in rows)
          row.task.toDomain(
            lotName: row.lotName,
            laborTypeName: row.laborTypeName,
          ),
      ];
}
