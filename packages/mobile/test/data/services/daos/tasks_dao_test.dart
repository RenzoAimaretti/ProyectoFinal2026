import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/daos/tasks_dao.dart';

import '../../repositories/drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late TasksDao dao;

  setUp(() async {
    db = createTestDatabase();
    dao = db.tasksDao;

    // FKs: Tasks.lotId → Lots.id, Tasks.laborTypeId → LaborTypes.id, y
    // Lots.farmId → Farms.id (Farms.clientId → Clients.id).
    await db.into(db.clients).insert(ClientsCompanion.insert(
          id: Value('client-1'),
          name: 'Cliente Test',
        ));
    await db.into(db.farms).insert(FarmsCompanion.insert(
          id: Value('farm-1'),
          clientId: 'client-1',
          name: 'Campo Test',
          surface: 500.0,
        ));
    await db.into(db.lots).insert(LotsCompanion.insert(
          id: Value('lot-1'),
          farmId: 'farm-1',
          name: 'Lote 1',
          area: 100.0,
        ));
    await db.into(db.lots).insert(LotsCompanion.insert(
          id: Value('lot-2'),
          farmId: 'farm-1',
          name: 'Lote 2',
          area: 80.0,
        ));
    await db.into(db.laborTypes).insert(LaborTypesCompanion.insert(
          id: Value('labor-1'),
          name: 'Siembra',
        ));

    await db.into(db.tasks).insert(TasksCompanion.insert(
          id: Value('task-1'),
          lotId: 'lot-1',
          laborTypeId: 'labor-1',
          status: 'PENDING',
        ));
    await db.into(db.tasks).insert(TasksCompanion.insert(
          id: Value('task-2'),
          lotId: 'lot-2',
          laborTypeId: 'labor-1',
          status: 'IN_PROGRESS',
        ));

    // Asignaciones: task-1 → op-1 y op-2; task-2 → solo op-1.
    await db.into(db.taskOperators).insert(TaskOperatorsCompanion.insert(
          taskId: 'task-1',
          operatorId: 'op-1',
        ));
    await db.into(db.taskOperators).insert(TaskOperatorsCompanion.insert(
          taskId: 'task-1',
          operatorId: 'op-2',
        ));
    await db.into(db.taskOperators).insert(TaskOperatorsCompanion.insert(
          taskId: 'task-2',
          operatorId: 'op-1',
        ));
  });

  tearDown(() => db.close());

  test('watchAssignedTo filtra por operatorId vía join Tasks ⋈ TaskOperators',
      () async {
    final forOp1 = await dao.watchAssignedTo('op-1').first;
    expect(forOp1.map((t) => t.id).toSet(), {'task-1', 'task-2'});

    final forOp2 = await dao.watchAssignedTo('op-2').first;
    expect(forOp2.map((t) => t.id).toSet(), {'task-1'});

    final forNobody = await dao.watchAssignedTo('op-99').first;
    expect(forNobody, isEmpty);
  });

  test('watchAll devuelve todas las tareas', () async {
    final all = await dao.watchAll().first;
    expect(all.map((t) => t.id).toSet(), {'task-1', 'task-2'});
  });

  test('getById devuelve la tarea correcta (o null si no existe)', () async {
    final task = await dao.getById('task-2');
    expect(task, isNotNull);
    expect(task!.id, 'task-2');
    expect(task.status, 'IN_PROGRESS');

    final missing = await dao.getById('task-inexistente');
    expect(missing, isNull);
  });
}
