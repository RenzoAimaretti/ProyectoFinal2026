import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_field_catalog_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/catalog_seeder.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/field_catalog.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftFieldCatalogRepository repository;

  setUp(() {
    db = createTestDatabase();
    repository = DriftFieldCatalogRepository(db);
  });

  tearDown(() => db.close());

  FieldCatalog catalog({
    String lotName = 'Lote 1',
    List<String> operators = const ['op-1'],
    bool withSecondLot = false,
  }) =>
      FieldCatalog(
        companies: const [(id: 'company-1', name: 'Eliggi', cuit: '30-1-1')],
        clients: const [(id: 'client-1', name: 'Cliente')],
        farms: const [(id: 'farm-1', clientId: 'client-1', name: 'Campo', surface: 100)],
        lots: [
          (id: 'lot-1', farmId: 'farm-1', name: lotName, area: 50),
          if (withSecondLot) (id: 'lot-2', farmId: 'farm-1', name: 'Lote 2', area: 20),
        ],
        laborTypes: const [(id: 'labor-1', name: 'Siembra')],
        machines: const [
          (id: 'machine-1', companyId: 'company-1', name: 'Tractor', brand: null, status: MachineStatus.ACTIVE),
          (id: 'machine-2', companyId: 'company-1', name: 'Sembradora', brand: 'JD', status: MachineStatus.MAINTENANCE),
        ],
        tasks: [
          (id: 'task-1', lotId: 'lot-1', laborTypeId: 'labor-1', status: TaskStatus.IN_PROGRESS, operatorIds: operators),
          if (withSecondLot)
            (id: 'task-2', lotId: 'lot-2', laborTypeId: 'labor-1', status: TaskStatus.PENDING, operatorIds: const ['op-1']),
        ],
        inputCategories: const [(id: 'cat-1', name: 'Herbicidas', active: true)],
        inputs: [
          (id: 'input-1', name: 'Glifosato', unit: 'L', categoryId: 'cat-1', active: true),
          if (withSecondLot) (id: 'input-2', name: 'Atrazina', unit: 'KG', categoryId: 'cat-1', active: true),
        ],
        laborTypeCategories: const [(laborTypeId: 'labor-1', categoryId: 'cat-1')],
        recipes: [
          (
            id: 'recipe-1',
            lotId: 'lot-1',
            date: DateTime.utc(2026, 11, 1),
            observations: null,
            items: const [(id: 'item-1', inputId: 'input-1', dose: 2.0, unit: 'L', loadOrder: 1)],
          ),
          if (withSecondLot)
            (
              id: 'recipe-2',
              lotId: 'lot-2',
              date: DateTime.utc(2026, 11, 2),
              observations: 'Dosis baja',
              items: const [(id: 'item-2', inputId: 'input-2', dose: 1.5, unit: 'KG', loadOrder: 1)],
            ),
        ],
      );

  Future<void> insertDailyReportFor(String taskId, String lotId) {
    return db.into(db.dailyReports).insert(
          DailyReportsCompanion.insert(
            id: const Value('report-1'),
            operatorId: 'op-1',
            companyId: 'company-1',
            taskId: taskId,
            lotId: lotId,
            laborTypeId: 'labor-1',
            date: DateTime.utc(2026, 11, 3),
            hectares: 10,
            hours: 2,
            status: 'PENDING',
          ),
        );
  }

  test('respeta el orden de dependencias y traduce los estados', () async {
    await repository.replaceWith(catalog());

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
    await repository.replaceWith(catalog());
    await repository.replaceWith(catalog(lotName: 'Lote 1 bis', operators: ['op-2']));

    final lots = await db.select(db.lots).get();
    expect(lots, hasLength(1));
    expect(lots.single.name, 'Lote 1 bis');

    final tasks = await db.select(db.tasks).get();
    expect(tasks, hasLength(1));

    final operators = await db.select(db.taskOperators).get();
    expect(operators, hasLength(1));
    expect(operators.single.operatorId, 'op-2');
  });

  test('guarda insumos, categorías, vínculos labor↔categoría y recetas activas', () async {
    await repository.replaceWith(catalog());

    final category = await db.select(db.inputCategories).getSingle();
    expect((category.id, category.name, category.active), ('cat-1', 'Herbicidas', true));

    final input = await db.select(db.inputs).getSingle();
    expect((input.id, input.name, input.unit, input.categoryId), ('input-1', 'Glifosato', 'L', 'cat-1'));

    final link = await db.select(db.laborTypeCategories).getSingle();
    expect((link.laborTypeId, link.categoryId), ('labor-1', 'cat-1'));

    final recipe = await db.select(db.recipes).getSingle();
    expect(recipe.lotId, 'lot-1');
    expect(recipe.status, 'ACTIVE');
    expect(recipe.date.toUtc(), DateTime.utc(2026, 11, 1));
    expect(recipe.observations, isNull);

    final item = await db.select(db.recipeItems).getSingle();
    expect((item.recipeId, item.inputId, item.dose, item.unit, item.loadOrder), ('recipe-1', 'input-1', 2.0, 'L', 1));
  });

  test('retira lo que ya no viene en la foto cuando nada local lo referencia', () async {
    await repository.replaceWith(catalog(withSecondLot: true));
    await repository.replaceWith(catalog());

    expect((await db.select(db.lots).get()).map((r) => r.id), ['lot-1']);
    expect((await db.select(db.tasks).get()).map((r) => r.id), ['task-1']);
    expect((await db.select(db.inputs).get()).map((r) => r.id), ['input-1']);
    expect((await db.select(db.recipes).get()).map((r) => r.id), ['recipe-1']);
    expect((await db.select(db.recipeItems).get()).map((r) => r.id), ['item-1']);
    expect(
      (await db.select(db.taskOperators).get()).map((r) => r.taskId),
      ['task-1'],
    );
  });

  test('una tarea que ya no viene pero tiene un parte local queda, sin operarios asignados', () async {
    await repository.replaceWith(catalog(withSecondLot: true));
    await insertDailyReportFor('task-2', 'lot-2');

    await repository.replaceWith(catalog());

    final taskIds = (await db.select(db.tasks).get()).map((r) => r.id).toList();
    expect(taskIds, containsAll(['task-1', 'task-2']));
    final assigned = (await db.select(db.taskOperators).get()).map((r) => r.taskId).toList();
    expect(assigned, ['task-1']);
    // El lote sigue porque la tarea y el parte lo referencian.
    expect((await db.select(db.lots).get()).map((r) => r.id), containsAll(['lot-1', 'lot-2']));
  });

  test('la foto real retira los datos demo que nada referencia', () async {
    await CatalogSeeder.seedIfEmpty(db);

    await repository.replaceWith(catalog());

    expect((await db.select(db.companies).get()).map((r) => r.id), ['company-1']);
    expect((await db.select(db.clients).get()).map((r) => r.id), ['client-1']);
    expect((await db.select(db.lots).get()).map((r) => r.id), ['lot-1']);
    expect((await db.select(db.inputs).get()).map((r) => r.id), ['input-1']);
    expect((await db.select(db.machines).get()).map((r) => r.id), containsAll(['machine-1', 'machine-2']));
    expect(await db.select(db.machines).get(), hasLength(2));
    expect((await db.select(db.tasks).get()).map((r) => r.id), ['task-1']);
  });
}
