import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'daos/clients_dao.dart';
import 'daos/companies_dao.dart';
import 'daos/daily_reports_dao.dart';
import 'daos/farms_dao.dart';
import 'daos/inputs_dao.dart';
import 'daos/labor_types_dao.dart';
import 'daos/lots_dao.dart';
import 'daos/machine_activities_dao.dart';
import 'daos/machines_dao.dart';
import 'daos/photos_dao.dart';
import 'daos/receptions_dao.dart';
import 'daos/recipes_dao.dart';
import 'daos/stocks_dao.dart';
import 'daos/sync_queue_dao.dart';

import 'tables/catalog_tables.dart';
import 'tables/infra_tables.dart';
import 'tables/machine_tables.dart';
import 'tables/production_tables.dart';
import 'tables/session_tables.dart';
import 'tables/stock_tables.dart';

part 'app_database.g.dart';

@DriftDatabase(
  tables: [
    Companies,
    Clients,
    Farms,
    Lots,
    LaborTypes,
    Inputs,
    Machines,
    Sessions,
    Recipes,
    RecipeItems,
    DailyReports,
    DailyReportItems,
    Receptions,
    ReceptionItems,
    Stocks,
    MachineActivities,
    Photos,
    SyncQueue,
  ],
  daos: [
    CompaniesDao,
    ClientsDao,
    FarmsDao,
    LotsDao,
    LaborTypesDao,
    InputsDao,
    MachinesDao,
    RecipesDao,
    DailyReportsDao,
    ReceptionsDao,
    StocksDao,
    MachineActivitiesDao,
    PhotosDao,
    SyncQueueDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  /// Constructor para tests con `NativeDatabase.memory()` (Phase 8).
  AppDatabase.forTesting(QueryExecutor executor) : super(executor);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        beforeOpen: (details) async {
          await customStatement('PRAGMA foreign_keys = ON');
        },
      );
}

QueryExecutor _openConnection() => driftDatabase(name: 'agrolify');
