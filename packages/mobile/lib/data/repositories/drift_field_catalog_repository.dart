import 'package:drift/drift.dart';

import '../../domain/models/enums.dart';
import '../../domain/models/field_catalog.dart';
import '../../domain/repositories/field_catalog_store.dart';
import '../models/enum_converters.dart';
import '../models/enum_wire_mapper.dart';
import '../services/app_database.dart';

/// Estado local de las recetas que trae el pull: el backend solo envía las
/// `ACTIVA`, que en el móvil se guardan en inglés.
const _activeRecipeStatus = 'ACTIVE';

/// Caché local del catálogo de campo.
///
/// [replaceWith] aplica la foto del backend en una sola transacción:
/// 1. upsert en orden de dependencias (firma → clientes → campos → lotes →
///    labores → categorías → insumos → vínculos → máquinas → tareas →
///    recetas), reemplazando operarios de cada tarea e ítems de cada receta;
/// 2. reconciliación en orden inverso: retira lo que ya no viene salvo que un
///    registro local (parte, recepción, stock, uso de máquina) lo referencie.
///    Una tarea retirada pierde sus operarios aunque se conserve, así deja de
///    figurar como asignada.
class DriftFieldCatalogRepository implements FieldCatalogStore {
  DriftFieldCatalogRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> replaceWith(FieldCatalog catalog) {
    return _db.transaction(() async {
      await _upsert(catalog);
      await _prune(catalog);
    });
  }

  Future<void> _upsert(FieldCatalog catalog) async {
    for (final company in catalog.companies) {
      await _db.into(_db.companies).insertOnConflictUpdate(
            CompaniesCompanion.insert(
              id: Value(company.id),
              name: company.name,
              cuit: company.cuit,
            ),
          );
    }

    for (final client in catalog.clients) {
      await _db.into(_db.clients).insertOnConflictUpdate(
            ClientsCompanion.insert(id: Value(client.id), name: client.name),
          );
    }

    for (final farm in catalog.farms) {
      await _db.into(_db.farms).insertOnConflictUpdate(
            FarmsCompanion.insert(
              id: Value(farm.id),
              clientId: farm.clientId,
              name: farm.name,
              surface: farm.surface,
            ),
          );
    }

    for (final lot in catalog.lots) {
      await _db.into(_db.lots).insertOnConflictUpdate(
            LotsCompanion.insert(
              id: Value(lot.id),
              farmId: lot.farmId,
              name: lot.name,
              area: lot.area,
            ),
          );
    }

    for (final laborType in catalog.laborTypes) {
      await _db.into(_db.laborTypes).insertOnConflictUpdate(
            LaborTypesCompanion.insert(
              id: Value(laborType.id),
              name: laborType.name,
            ),
          );
    }

    for (final category in catalog.inputCategories) {
      await _db.into(_db.inputCategories).insertOnConflictUpdate(
            InputCategoriesCompanion.insert(
              id: Value(category.id),
              name: category.name,
              active: Value(category.active),
            ),
          );
    }

    for (final input in catalog.inputs) {
      await _db.into(_db.inputs).insertOnConflictUpdate(
            InputsCompanion.insert(
              id: Value(input.id),
              name: input.name,
              unit: input.unit,
              categoryId: Value(input.categoryId),
              active: Value(input.active),
            ),
          );
    }

    // Tabla puente pura: nada local la referencia, se reemplaza completa.
    await _db.delete(_db.laborTypeCategories).go();
    for (final link in catalog.laborTypeCategories) {
      await _db.into(_db.laborTypeCategories).insert(
            LaborTypeCategoriesCompanion.insert(
              laborTypeId: link.laborTypeId,
              categoryId: link.categoryId,
            ),
          );
    }

    for (final machine in catalog.machines) {
      await _db.into(_db.machines).insertOnConflictUpdate(
            MachinesCompanion.insert(
              id: Value(machine.id),
              companyId: machine.companyId,
              name: machine.name,
              brand: Value(machine.brand),
              status: machineStatusToText(machine.status),
            ),
          );
    }

    for (final task in catalog.tasks) {
      await _db.into(_db.tasks).insertOnConflictUpdate(
            TasksCompanion.insert(
              id: Value(task.id),
              lotId: task.lotId,
              laborTypeId: task.laborTypeId,
              status: taskStatusToText(task.status),
            ),
          );
      await _unassign(task.id);
      for (final operatorId in task.operatorIds) {
        await _db.into(_db.taskOperators).insert(
              TaskOperatorsCompanion.insert(
                taskId: task.id,
                operatorId: operatorId,
              ),
            );
      }
    }

    for (final recipe in catalog.recipes) {
      await _db.into(_db.recipes).insertOnConflictUpdate(
            RecipesCompanion.insert(
              id: Value(recipe.id),
              lotId: recipe.lotId,
              date: recipe.date,
              status: _activeRecipeStatus,
              observations: Value(recipe.observations),
            ),
          );
      await _clearRecipeItems(recipe.id);
      for (final item in recipe.items) {
        await _db.into(_db.recipeItems).insert(
              RecipeItemsCompanion.insert(
                id: Value(item.id),
                recipeId: recipe.id,
                inputId: item.inputId,
                dose: item.dose,
                unit: Value(item.unit),
                loadOrder: item.loadOrder,
              ),
            );
      }
    }
  }

  Future<void> _prune(FieldCatalog catalog) async {
    final taskIds = {for (final t in catalog.tasks) t.id};
    for (final id in await _ids(_db.tasks, _db.tasks.id)) {
      if (!taskIds.contains(id)) await _unassign(id);
    }
    await _deleteAbsent(_db.tasks, _db.tasks.id, taskIds, [
      (_db.dailyReports, _db.dailyReports.taskId),
      (_db.machineUsages, _db.machineUsages.taskId),
    ]);

    final recipeIds = {for (final r in catalog.recipes) r.id};
    for (final id in await _ids(_db.recipes, _db.recipes.id)) {
      if (!recipeIds.contains(id)) await _clearRecipeItems(id);
    }
    await _deleteAbsent(_db.recipes, _db.recipes.id, recipeIds, const []);

    await _deleteAbsent(
      _db.machines,
      _db.machines.id,
      {for (final m in catalog.machines) m.id},
      [
        (_db.machineActivities, _db.machineActivities.machineId),
        (_db.machineUsages, _db.machineUsages.machineId),
      ],
    );
    await _deleteAbsent(
      _db.inputs,
      _db.inputs.id,
      {for (final i in catalog.inputs) i.id},
      [
        (_db.recipeItems, _db.recipeItems.inputId),
        (_db.dailyReportItems, _db.dailyReportItems.inputId),
        (_db.receptionItems, _db.receptionItems.inputId),
        (_db.stocks, _db.stocks.inputId),
      ],
    );
    await _deleteAbsent(
      _db.inputCategories,
      _db.inputCategories.id,
      {for (final c in catalog.inputCategories) c.id},
      [
        (_db.inputs, _db.inputs.categoryId),
        (_db.laborTypeCategories, _db.laborTypeCategories.categoryId),
      ],
    );
    await _deleteAbsent(
      _db.lots,
      _db.lots.id,
      {for (final l in catalog.lots) l.id},
      [
        (_db.tasks, _db.tasks.lotId),
        (_db.recipes, _db.recipes.lotId),
        (_db.dailyReports, _db.dailyReports.lotId),
      ],
    );
    await _deleteAbsent(
      _db.farms,
      _db.farms.id,
      {for (final f in catalog.farms) f.id},
      [(_db.lots, _db.lots.farmId)],
    );
    await _deleteAbsent(
      _db.clients,
      _db.clients.id,
      {for (final c in catalog.clients) c.id},
      [
        (_db.farms, _db.farms.clientId),
        (_db.receptions, _db.receptions.clientId),
        (_db.stocks, _db.stocks.clientId),
      ],
    );
    await _deleteAbsent(
      _db.laborTypes,
      _db.laborTypes.id,
      {for (final l in catalog.laborTypes) l.id},
      [
        (_db.tasks, _db.tasks.laborTypeId),
        (_db.dailyReports, _db.dailyReports.laborTypeId),
        (_db.laborTypeCategories, _db.laborTypeCategories.laborTypeId),
      ],
    );
    await _deleteAbsent(
      _db.companies,
      _db.companies.id,
      {for (final c in catalog.companies) c.id},
      [
        (_db.machines, _db.machines.companyId),
        (_db.machineActivities, _db.machineActivities.companyId),
        (_db.dailyReports, _db.dailyReports.companyId),
      ],
    );
  }

  Future<void> _unassign(String taskId) {
    return (_db.delete(_db.taskOperators)
          ..where((row) => row.taskId.equals(taskId)))
        .go();
  }

  Future<void> _clearRecipeItems(String recipeId) {
    return (_db.delete(_db.recipeItems)
          ..where((row) => row.recipeId.equals(recipeId)))
        .go();
  }

  Future<List<String>> _ids(TableInfo table, GeneratedColumn<String> id) async {
    final rows = await _db
        .customSelect(
          'SELECT ${id.name} AS id FROM ${table.actualTableName}',
          readsFrom: {table},
        )
        .get();
    return [for (final row in rows) row.read<String>('id')];
  }

  /// Borra las filas de [table] cuyo id no está en [keep] y que ninguna de las
  /// columnas [referencedBy] apunta.
  Future<void> _deleteAbsent(
    TableInfo table,
    GeneratedColumn<String> id,
    Set<String> keep,
    List<(TableInfo, GeneratedColumn<String>)> referencedBy,
  ) async {
    final sql = [
      'DELETE FROM ${table.actualTableName} WHERE ${id.name} = ?1',
      for (final (refTable, refColumn) in referencedBy)
        'NOT EXISTS (SELECT 1 FROM ${refTable.actualTableName} '
            'WHERE ${refColumn.name} = ?1)',
    ].join(' AND ');

    for (final candidate in await _ids(table, id)) {
      if (keep.contains(candidate)) continue;
      await _db.customUpdate(
        sql,
        variables: [Variable.withString(candidate)],
        updates: {table},
        updateKind: UpdateKind.delete,
      );
    }
  }
}

/// Extrae el nombre legible de una tarea a partir del catálogo cacheado.
/// Se mantiene aquí para que la UI no dependa de ids cuando hay nombres.
String taskDisplayLabel({
  required String taskId,
  String? lotName,
  String? laborTypeName,
}) {
  final parts = [
    if (laborTypeName != null && laborTypeName.trim().isNotEmpty)
      laborTypeName.trim(),
    if (lotName != null && lotName.trim().isNotEmpty) lotName.trim(),
  ];
  if (parts.isEmpty) {
    final short = taskId.length > 8 ? taskId.substring(0, 8) : taskId;
    return 'Tarea $short';
  }
  return parts.join(' · ');
}

/// Estado local de una máquina a partir del wire (compatibilidad).
String machineStatusWireToLocalText(String wire) =>
    machineStatusToText(machineStatusFromWire(wire) ?? MachineStatus.OUT_OF_SERVICE);
