import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/task_tables.dart';

part 'tasks_dao.g.dart';

@DriftAccessor(tables: [Tasks, TaskOperators])
class TasksDao extends DatabaseAccessor<AppDatabase> with _$TasksDaoMixin {
  TasksDao(AppDatabase db) : super(db);

  /// Tareas asignadas a un operario (join `Tasks ⋈ TaskOperators`).
  Stream<List<Task>> watchAssignedTo(String operatorId) {
    final query = select(tasks).join([
      innerJoin(taskOperators, taskOperators.taskId.equalsExp(tasks.id)),
    ])
      ..where(taskOperators.operatorId.equals(operatorId))
      ..orderBy([OrderingTerm.desc(tasks.createdAt)]);
    return query.map((row) => row.readTable(tasks)).watch();
  }

  Stream<List<Task>> watchAll() {
    return (select(tasks)..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch();
  }

  Future<Task?> getById(String id) {
    return (select(tasks)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
