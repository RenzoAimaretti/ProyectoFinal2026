import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'catalog_tables.dart';

/// Producción (CUU05). Sin `version`/`deleted`: se sincroniza por SyncQueue.
@TableIndex(name: 'idx_recipes_lot_id', columns: {#lotId})
@DataClassName('Recipe')
class Recipes extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get lotId => text().references(Lots, #id)();
  DateTimeColumn get date => dateTime()();
  TextColumn get status => text()();
  TextColumn get observations => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(name: 'idx_recipe_items_recipe_id', columns: {#recipeId})
@DataClassName('RecipeItem')
class RecipeItems extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get recipeId =>
      text().references(Recipes, #id, onDelete: KeyAction.cascade)();
  TextColumn get inputId => text().references(Inputs, #id)();
  RealColumn get dose => real()();
  TextColumn get unit => text().nullable()();
  IntColumn get loadOrder => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(name: 'idx_daily_reports_status_date', columns: {#status, #date})
@TableIndex(name: 'idx_daily_reports_lot_id', columns: {#lotId})
@DataClassName('DailyReport')
class DailyReports extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get operatorId => text()();
  TextColumn get companyId => text().references(Companies, #id)();
  TextColumn get lotId => text().references(Lots, #id)();
  TextColumn get laborTypeId => text().references(LaborTypes, #id)();
  DateTimeColumn get date => dateTime()();
  RealColumn get hectares => real()();
  RealColumn get hours => real()();
  TextColumn get status => text()();
  TextColumn get rejectionReason => text().nullable()();
  DateTimeColumn get approvedAt => dateTime().nullable()();
  TextColumn get approvedBy => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(name: 'idx_daily_report_items_report_id', columns: {#dailyReportId})
@DataClassName('DailyReportItem')
class DailyReportItems extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get dailyReportId =>
      text().references(DailyReports, #id, onDelete: KeyAction.cascade)();
  TextColumn get inputId => text().references(Inputs, #id)();
  RealColumn get quantity => real()();
  TextColumn get unit => text()();

  @override
  Set<Column> get primaryKey => {id};
}
