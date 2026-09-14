import 'package:drift/drift.dart';

import '../../domain/models/enums.dart';
import 'app_database.dart';

/// Fixtures de desarrollo: siembra catálogos de ejemplo (companies, clients,
/// farms, lots, labor types, inputs, machines) SOLO cuando la tabla
/// correspondiente está vacía (idempotente).
///
/// Vive en `data/` porque escribe directo contra `AppDatabase` (drift) y no
/// pasa por el dominio ni por use cases. Se invoca una sola vez al arranque
/// desde el composition root (`main.dart`); si falla, se traga el error.
class CatalogSeeder {
  const CatalogSeeder._();

  /// Siembra las tablas de catálogo vacías con datos dummy.
  static Future<void> seedIfEmpty(AppDatabase db) async {
    await _seedCompanies(db);
    await _seedClients(db);
    await _seedFarms(db);
    await _seedLots(db);
    await _seedLaborTypes(db);
    await _seedInputs(db);
    await _seedMachines(db);
    await _seedRecipes(db);
    await _seedTasks(db);
  }

  static Future<void> _seedCompanies(AppDatabase db) async {
    if ((await db.select(db.companies).get()).isNotEmpty) return;
    await db.companies.insertAll([
      CompaniesCompanion.insert(
        id: const Value('comp-eliggi'),
        name: 'Eliggi',
        cuit: '30-00000001-1',
      ),
      CompaniesCompanion.insert(
        id: const Value('comp-eliggi-tufoni'),
        name: 'Eliggi Tufoni',
        cuit: '30-00000002-2',
      ),
    ]);
  }

  static Future<void> _seedClients(AppDatabase db) async {
    if ((await db.select(db.clients).get()).isNotEmpty) return;
    await db.clients.insertAll([
      ClientsCompanion.insert(
        id: const Value('client-el-sauce'),
        name: 'Estancia El Sauce',
      ),
      ClientsCompanion.insert(
        id: const Value('client-agro-norte'),
        name: 'Agro Norte',
      ),
    ]);
  }

  static Future<void> _seedFarms(AppDatabase db) async {
    if ((await db.select(db.farms).get()).isNotEmpty) return;
    await db.farms.insertAll([
      FarmsCompanion.insert(
        id: const Value('farm-el-sauce'),
        clientId: 'client-el-sauce',
        name: 'El Sauce — Campo Norte',
        surface: 1250.0,
      ),
      FarmsCompanion.insert(
        id: const Value('farm-agro-norte'),
        clientId: 'client-agro-norte',
        name: 'Agro Norte — Establecimiento Sur',
        surface: 980.0,
      ),
    ]);
  }

  static Future<void> _seedLots(AppDatabase db) async {
    if ((await db.select(db.lots).get()).isNotEmpty) return;
    await db.lots.insertAll([
      LotsCompanion.insert(
        id: const Value('lot-el-sauce-1'),
        farmId: 'farm-el-sauce',
        name: 'Lote 1',
        area: 120.0,
      ),
      LotsCompanion.insert(
        id: const Value('lot-el-sauce-2'),
        farmId: 'farm-el-sauce',
        name: 'Lote 2',
        area: 150.0,
      ),
      LotsCompanion.insert(
        id: const Value('lot-agro-norte-1'),
        farmId: 'farm-agro-norte',
        name: 'Lote A',
        area: 200.0,
      ),
      LotsCompanion.insert(
        id: const Value('lot-agro-norte-2'),
        farmId: 'farm-agro-norte',
        name: 'Lote B',
        area: 180.0,
      ),
    ]);
  }

  static Future<void> _seedLaborTypes(AppDatabase db) async {
    if ((await db.select(db.laborTypes).get()).isNotEmpty) return;
    await db.laborTypes.insertAll([
      LaborTypesCompanion.insert(
        id: const Value('labor-pulverizacion'),
        name: 'Pulverización',
      ),
      LaborTypesCompanion.insert(
        id: const Value('labor-siembra'),
        name: 'Siembra',
      ),
      LaborTypesCompanion.insert(
        id: const Value('labor-cosecha'),
        name: 'Cosecha',
      ),
    ]);
  }

  static Future<void> _seedInputs(AppDatabase db) async {
    if ((await db.select(db.inputs).get()).isNotEmpty) return;
    await db.inputs.insertAll([
      InputsCompanion.insert(
        id: const Value('input-glifosato'),
        name: 'Glifosato 48%',
        unit: 'L',
      ),
      InputsCompanion.insert(
        id: const Value('input-urea'),
        name: 'Urea',
        unit: 'KG',
      ),
      InputsCompanion.insert(
        id: const Value('input-semilla-soja'),
        name: 'Semilla Soja',
        unit: 'UNIT',
      ),
    ]);
  }

  static Future<void> _seedMachines(AppDatabase db) async {
    if ((await db.select(db.machines).get()).isNotEmpty) return;
    await db.machines.insertAll([
      MachinesCompanion.insert(
        id: const Value('machine-tractor-jd'),
        companyId: 'comp-eliggi',
        name: 'Tractor John Deere 6400',
        brand: const Value('John Deere'),
        status: MachineStatus.ACTIVE.name,
      ),
      MachinesCompanion.insert(
        id: const Value('machine-pulverizadora'),
        companyId: 'comp-eliggi',
        name: 'Pulverizadora Metalfor',
        brand: const Value('Metalfor'),
        status: MachineStatus.ACTIVE.name,
      ),
    ]);
  }

  /// Siembra una receta por lote (R009) + ítems, para que el alta de partes
  /// diarios no quede bloqueada por la regla de receta previa en el demo.
  static Future<void> _seedRecipes(AppDatabase db) async {
    if ((await db.select(db.recipes).get()).isNotEmpty) return;
    final now = DateTime.now();
    await db.recipes.insertAll([
      RecipesCompanion.insert(
        id: const Value('recipe-lot-el-sauce-1'),
        lotId: 'lot-el-sauce-1',
        date: now,
        status: 'ACTIVE',
      ),
      RecipesCompanion.insert(
        id: const Value('recipe-lot-el-sauce-2'),
        lotId: 'lot-el-sauce-2',
        date: now,
        status: 'ACTIVE',
      ),
      RecipesCompanion.insert(
        id: const Value('recipe-lot-agro-norte-1'),
        lotId: 'lot-agro-norte-1',
        date: now,
        status: 'ACTIVE',
      ),
      RecipesCompanion.insert(
        id: const Value('recipe-lot-agro-norte-2'),
        lotId: 'lot-agro-norte-2',
        date: now,
        status: 'ACTIVE',
      ),
    ]);

    if ((await db.select(db.recipeItems).get()).isNotEmpty) return;
    await db.recipeItems.insertAll([
      RecipeItemsCompanion.insert(
        id: const Value('recipe-item-1'),
        recipeId: 'recipe-lot-el-sauce-1',
        inputId: 'input-glifosato',
        dose: 2.0,
        loadOrder: 1,
      ),
      RecipeItemsCompanion.insert(
        id: const Value('recipe-item-2'),
        recipeId: 'recipe-lot-el-sauce-2',
        inputId: 'input-glifosato',
        dose: 2.5,
        loadOrder: 1,
      ),
      RecipeItemsCompanion.insert(
        id: const Value('recipe-item-3'),
        recipeId: 'recipe-lot-agro-norte-1',
        inputId: 'input-semilla-soja',
        dose: 60.0,
        loadOrder: 1,
      ),
      RecipeItemsCompanion.insert(
        id: const Value('recipe-item-4'),
        recipeId: 'recipe-lot-agro-norte-1',
        inputId: 'input-urea',
        dose: 100.0,
        loadOrder: 2,
      ),
      RecipeItemsCompanion.insert(
        id: const Value('recipe-item-5'),
        recipeId: 'recipe-lot-agro-norte-2',
        inputId: 'input-semilla-soja',
        dose: 55.0,
        loadOrder: 1,
      ),
    ]);
  }

  /// Siembra tareas de labor coherentes con los lotes/labores ya existentes.
  /// La mayoría quedan asignadas a `demo-operario`; al menos una queda SIN
  /// asignar (cubre el flujo A4 "Cargar sobre otra tarea").
  static Future<void> _seedTasks(AppDatabase db) async {
    if ((await db.select(db.tasks).get()).isNotEmpty) return;
    await db.tasks.insertAll([
      TasksCompanion.insert(
        id: const Value('task-el-sauce-1'),
        lotId: 'lot-el-sauce-1',
        laborTypeId: 'labor-pulverizacion',
        status: TaskStatus.PENDING.name,
      ),
      TasksCompanion.insert(
        id: const Value('task-el-sauce-2'),
        lotId: 'lot-el-sauce-2',
        laborTypeId: 'labor-siembra',
        status: TaskStatus.IN_PROGRESS.name,
      ),
      TasksCompanion.insert(
        id: const Value('task-agro-norte-1'),
        lotId: 'lot-agro-norte-1',
        laborTypeId: 'labor-cosecha',
        status: TaskStatus.PENDING.name,
      ),
      // Sin asignar (A4): el operario puede cargar sobre una tarea no propia.
      TasksCompanion.insert(
        id: const Value('task-agro-norte-2'),
        lotId: 'lot-agro-norte-2',
        laborTypeId: 'labor-siembra',
        status: TaskStatus.PENDING.name,
      ),
    ]);

    if ((await db.select(db.taskOperators).get()).isNotEmpty) return;
    await db.taskOperators.insertAll([
      TaskOperatorsCompanion.insert(
        id: const Value('task-op-el-sauce-1'),
        taskId: 'task-el-sauce-1',
        operatorId: 'demo-operario',
      ),
      TaskOperatorsCompanion.insert(
        id: const Value('task-op-el-sauce-2'),
        taskId: 'task-el-sauce-2',
        operatorId: 'demo-operario',
      ),
      TaskOperatorsCompanion.insert(
        id: const Value('task-op-agro-norte-1'),
        taskId: 'task-agro-norte-1',
        operatorId: 'demo-operario',
      ),
    ]);
  }
}
