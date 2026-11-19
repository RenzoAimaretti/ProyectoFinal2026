import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_field_catalog_repository.dart';
import 'package:mobile/data/repositories/drift_task_reader.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/field_catalog.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftTaskReader reader;

  setUp(() async {
    db = createTestDatabase();
    reader = DriftTaskReader(db);
    await DriftFieldCatalogRepository(db).replaceWith(
      const FieldCatalog(
        companies: [(id: 'company-1', name: 'Eliggi', cuit: '30-1-1')],
        clients: [(id: 'client-1', name: 'Cliente')],
        farms: [(id: 'farm-1', clientId: 'client-1', name: 'Campo', surface: 100)],
        lots: [(id: 'lot-1', farmId: 'farm-1', name: 'Lote N°4', area: 50)],
        laborTypes: [(id: 'labor-1', name: 'Pulverización')],
        machines: [],
        tasks: [
          (id: 'task-1', lotId: 'lot-1', laborTypeId: 'labor-1', status: TaskStatus.IN_PROGRESS, operatorIds: ['op-1']),
          (id: 'task-2', lotId: 'lot-1', laborTypeId: 'labor-1', status: TaskStatus.PENDING, operatorIds: []),
        ],
      ),
    );
  });

  tearDown(() => db.close());

  test('las tareas asignadas traen el nombre del lote y de la labor', () async {
    final tasks = await reader.watchAssignedTo('op-1').first;

    expect(tasks.map((t) => t.id), ['task-1']);
    expect(tasks.single.lotName, 'Lote N°4');
    expect(tasks.single.laborTypeName, 'Pulverización');
    expect(tasks.single.displayLabel, 'Pulverización · Lote N°4');
  });

  test('todas las tareas (selector A4) también traen los nombres', () async {
    final tasks = await reader.watchAll().first;

    expect(tasks, hasLength(2));
    expect(tasks.map((t) => t.displayLabel).toSet(), {'Pulverización · Lote N°4'});
  });

  test('getById conserva lote y labor (ids y nombres) para el parte', () async {
    final task = await reader.getById('task-1');

    expect(task!.lotId, 'lot-1');
    expect(task.laborTypeId, 'labor-1');
    expect(task.status, TaskStatus.IN_PROGRESS);
    expect(task.lotName, 'Lote N°4');
    expect(task.laborTypeName, 'Pulverización');
  });
}
