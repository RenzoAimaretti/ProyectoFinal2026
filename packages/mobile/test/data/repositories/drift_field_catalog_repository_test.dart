import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_field_catalog_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/field_catalog_api_service.dart';
import 'package:mobile/domain/models/enums.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftFieldCatalogRepository repository;

  setUp(() {
    db = createTestDatabase();
    repository = DriftFieldCatalogRepository(db);
  });

  tearDown(() => db.close());

  FieldCatalog catalog({String lotName = 'Lote 1', List<String> operators = const ['op-1']}) => FieldCatalog(
        companies: const [(id: 'company-1', name: 'Eliggi', cuit: '30-1-1')],
        clients: const [(id: 'client-1', name: 'Cliente')],
        farms: const [(id: 'farm-1', clientId: 'client-1', name: 'Campo', surface: 100)],
        lots: [(id: 'lot-1', farmId: 'farm-1', name: lotName, area: 50)],
        laborTypes: const [(id: 'labor-1', name: 'Siembra')],
        machines: const [
          (id: 'machine-1', companyId: 'company-1', name: 'Tractor', brand: null, status: MachineStatus.ACTIVE),
          (id: 'machine-2', companyId: 'company-1', name: 'Sembradora', brand: 'JD', status: MachineStatus.MAINTENANCE),
        ],
        tasks: [
          (id: 'task-1', lotId: 'lot-1', laborTypeId: 'labor-1', status: TaskStatus.IN_PROGRESS, operatorIds: operators),
        ],
      );

  test('respeta el orden de dependencias y traduce los estados', () async {
    await repository.save(catalog());

    final machine = await (db.select(db.machines)..where((m) => m.id.equals('machine-1'))).getSingle();
    expect(machine.status, 'ACTIVE');
    final maintenance = await (db.select(db.machines)..where((m) => m.id.equals('machine-2'))).getSingle();
    expect(maintenance.status, 'MAINTENANCE');

    final task = await db.select(db.tasks).getSingle();
    expect(task.lotId, 'lot-1');
    expect(task.status, 'IN_PROGRESS');

    final operators = await db.select(db.taskOperators).get();
    expect(operators.single.operatorId, 'op-1');
  });

  test('reejecutar actualiza nombres y reemplaza operarios sin duplicar', () async {
    await repository.save(catalog());
    await repository.save(catalog(lotName: 'Lote 1 bis', operators: ['op-2']));

    final lots = await db.select(db.lots).get();
    expect(lots, hasLength(1));
    expect(lots.single.name, 'Lote 1 bis');

    final tasks = await db.select(db.tasks).get();
    expect(tasks, hasLength(1));

    final operators = await db.select(db.taskOperators).get();
    expect(operators, hasLength(1));
    expect(operators.single.operatorId, 'op-2');
  });

  test('construye etiquetas legibles cuando hay nombres', () {
    expect(
      taskDisplayLabel(taskId: 'task-1', lotName: 'Lote 1', laborTypeName: 'Siembra'),
      'Siembra · Lote 1',
    );
    expect(taskDisplayLabel(taskId: '1234567890'), 'Tarea 12345678');
  });
}
