// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'machine_activities_dao.dart';

// ignore_for_file: type=lint
mixin _$MachineActivitiesDaoMixin on DatabaseAccessor<AppDatabase> {
  $CompaniesTable get companies => attachedDatabase.companies;
  $MachinesTable get machines => attachedDatabase.machines;
  $MachineActivitiesTable get machineActivities =>
      attachedDatabase.machineActivities;
  MachineActivitiesDaoManager get managers => MachineActivitiesDaoManager(this);
}

class MachineActivitiesDaoManager {
  final _$MachineActivitiesDaoMixin _db;
  MachineActivitiesDaoManager(this._db);
  $$CompaniesTableTableManager get companies =>
      $$CompaniesTableTableManager(_db.attachedDatabase, _db.companies);
  $$MachinesTableTableManager get machines =>
      $$MachinesTableTableManager(_db.attachedDatabase, _db.machines);
  $$MachineActivitiesTableTableManager get machineActivities =>
      $$MachineActivitiesTableTableManager(
        _db.attachedDatabase,
        _db.machineActivities,
      );
}
