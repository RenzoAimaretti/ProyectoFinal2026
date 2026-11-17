// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'machine_usages_dao.dart';

// ignore_for_file: type=lint
mixin _$MachineUsagesDaoMixin on DatabaseAccessor<AppDatabase> {
  $CompaniesTable get companies => attachedDatabase.companies;
  $MachinesTable get machines => attachedDatabase.machines;
  $ClientsTable get clients => attachedDatabase.clients;
  $FarmsTable get farms => attachedDatabase.farms;
  $LotsTable get lots => attachedDatabase.lots;
  $LaborTypesTable get laborTypes => attachedDatabase.laborTypes;
  $TasksTable get tasks => attachedDatabase.tasks;
  $MachineUsagesTable get machineUsages => attachedDatabase.machineUsages;
  MachineUsagesDaoManager get managers => MachineUsagesDaoManager(this);
}

class MachineUsagesDaoManager {
  final _$MachineUsagesDaoMixin _db;
  MachineUsagesDaoManager(this._db);
  $$CompaniesTableTableManager get companies =>
      $$CompaniesTableTableManager(_db.attachedDatabase, _db.companies);
  $$MachinesTableTableManager get machines =>
      $$MachinesTableTableManager(_db.attachedDatabase, _db.machines);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$FarmsTableTableManager get farms =>
      $$FarmsTableTableManager(_db.attachedDatabase, _db.farms);
  $$LotsTableTableManager get lots =>
      $$LotsTableTableManager(_db.attachedDatabase, _db.lots);
  $$LaborTypesTableTableManager get laborTypes =>
      $$LaborTypesTableTableManager(_db.attachedDatabase, _db.laborTypes);
  $$TasksTableTableManager get tasks =>
      $$TasksTableTableManager(_db.attachedDatabase, _db.tasks);
  $$MachineUsagesTableTableManager get machineUsages =>
      $$MachineUsagesTableTableManager(_db.attachedDatabase, _db.machineUsages);
}
