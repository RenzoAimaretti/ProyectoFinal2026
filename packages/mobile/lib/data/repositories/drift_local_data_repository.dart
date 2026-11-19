import 'package:drift/drift.dart';

import '../../domain/repositories/demo_catalog_seeder.dart';
import '../../domain/repositories/local_data_repository.dart';
import '../services/app_database.dart';
import '../services/catalog_seeder.dart';

/// Datos de negocio locales en drift (todo salvo `Sessions`).
class DriftLocalDataRepository implements LocalDataRepository {
  DriftLocalDataRepository(this._db);

  final AppDatabase _db;

  @override
  Future<int> countPendingSync() {
    final count = _db.syncQueue.id.count();
    final query = _db.selectOnly(_db.syncQueue)..addColumns([count]);
    return query.map((row) => row.read(count) ?? 0).getSingle();
  }

  /// Borra en orden hijo → padre para respetar las claves foráneas (están
  /// activas). Si se agrega una tabla al esquema, el test de este adaptador
  /// falla hasta que se sume acá.
  @override
  Future<void> clearAll() {
    final tablesChildFirst = <TableInfo>[
      _db.syncQueue,
      _db.photos,
      _db.weatherCache,
      _db.dailyReportItems,
      _db.dailyReports,
      _db.receptionItems,
      _db.receptions,
      _db.stocks,
      _db.machineUsages,
      _db.machineActivities,
      _db.recipeItems,
      _db.recipes,
      _db.taskOperators,
      _db.tasks,
      _db.laborTypeCategories,
      _db.inputs,
      _db.inputCategories,
      _db.machines,
      _db.lots,
      _db.farms,
      _db.clients,
      _db.laborTypes,
      _db.companies,
    ];
    return _db.transaction(() async {
      for (final table in tablesChildFirst) {
        await _db.delete(table).go();
      }
    });
  }
}

/// Catálogo ficticio del modo demo, sobre [CatalogSeeder].
class DriftDemoCatalogSeeder implements DemoCatalogSeeder {
  DriftDemoCatalogSeeder(this._db);

  final AppDatabase _db;

  @override
  Future<void> seed() => CatalogSeeder.seedIfEmpty(_db);
}
