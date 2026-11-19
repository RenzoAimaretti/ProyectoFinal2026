import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/task_tables.dart';

part 'tasks_dao.g.dart';

/// Tarea con los nombres de su lote y labor (LEFT JOIN: si el catálogo todavía
/// no los tiene, quedan `null` y la UI cae a un id corto).
typedef TaskWithNames = ({Task task, String? lotName, String? laborTypeName});

@DriftAccessor(tables: [Tasks, TaskOperators])
class TasksDao extends DatabaseAccessor<AppDatabase> with _$TasksDaoMixin {
  TasksDao(AppDatabase db) : super(db);

  /// Tareas asignadas a un operario (join `Tasks ⋈ TaskOperators`), con los
  /// nombres de lote y labor.
  Stream<List<TaskWithNames>> watchAssignedTo(String operatorId) {
    final query = _withNames([
      innerJoin(taskOperators, taskOperators.taskId.equalsExp(tasks.id)),
    ])
      ..where(taskOperators.operatorId.equals(operatorId));
    return query.map(_readWithNames).watch();
  }

  /// Todas las tareas (selector A4), con los nombres de lote y labor.
  Stream<List<TaskWithNames>> watchAll() {
    return _withNames(const []).map(_readWithNames).watch();
  }

  Future<Task?> getById(String id) {
    return (select(tasks)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  /// Una tarea por id, con los nombres de lote y labor.
  Future<TaskWithNames?> getByIdWithNames(String id) {
    return (_withNames(const [])..where(tasks.id.equals(id)))
        .map(_readWithNames)
        .getSingleOrNull();
  }

  JoinedSelectStatement<HasResultSet, dynamic> _withNames(List<Join> extra) {
    final lots = attachedDatabase.lots;
    final laborTypes = attachedDatabase.laborTypes;
    return select(tasks).join([
      ...extra,
      leftOuterJoin(lots, lots.id.equalsExp(tasks.lotId)),
      leftOuterJoin(laborTypes, laborTypes.id.equalsExp(tasks.laborTypeId)),
    ])
      ..orderBy([OrderingTerm.desc(tasks.createdAt)]);
  }

  TaskWithNames _readWithNames(TypedResult row) => (
        task: row.readTable(tasks),
        lotName: row.readTableOrNull(attachedDatabase.lots)?.name,
        laborTypeName: row.readTableOrNull(attachedDatabase.laborTypes)?.name,
      );
}
