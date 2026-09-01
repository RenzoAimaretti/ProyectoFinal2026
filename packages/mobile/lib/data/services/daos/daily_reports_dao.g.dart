// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'daily_reports_dao.dart';

// ignore_for_file: type=lint
mixin _$DailyReportsDaoMixin on DatabaseAccessor<AppDatabase> {
  $CompaniesTable get companies => attachedDatabase.companies;
  $ClientsTable get clients => attachedDatabase.clients;
  $FarmsTable get farms => attachedDatabase.farms;
  $LotsTable get lots => attachedDatabase.lots;
  $LaborTypesTable get laborTypes => attachedDatabase.laborTypes;
  $DailyReportsTable get dailyReports => attachedDatabase.dailyReports;
  DailyReportsDaoManager get managers => DailyReportsDaoManager(this);
}

class DailyReportsDaoManager {
  final _$DailyReportsDaoMixin _db;
  DailyReportsDaoManager(this._db);
  $$CompaniesTableTableManager get companies =>
      $$CompaniesTableTableManager(_db.attachedDatabase, _db.companies);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$FarmsTableTableManager get farms =>
      $$FarmsTableTableManager(_db.attachedDatabase, _db.farms);
  $$LotsTableTableManager get lots =>
      $$LotsTableTableManager(_db.attachedDatabase, _db.lots);
  $$LaborTypesTableTableManager get laborTypes =>
      $$LaborTypesTableTableManager(_db.attachedDatabase, _db.laborTypes);
  $$DailyReportsTableTableManager get dailyReports =>
      $$DailyReportsTableTableManager(_db.attachedDatabase, _db.dailyReports);
}
