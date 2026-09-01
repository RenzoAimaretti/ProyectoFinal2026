// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'machines_dao.dart';

// ignore_for_file: type=lint
mixin _$MachinesDaoMixin on DatabaseAccessor<AppDatabase> {
  $CompaniesTable get companies => attachedDatabase.companies;
  $MachinesTable get machines => attachedDatabase.machines;
  MachinesDaoManager get managers => MachinesDaoManager(this);
}

class MachinesDaoManager {
  final _$MachinesDaoMixin _db;
  MachinesDaoManager(this._db);
  $$CompaniesTableTableManager get companies =>
      $$CompaniesTableTableManager(_db.attachedDatabase, _db.companies);
  $$MachinesTableTableManager get machines =>
      $$MachinesTableTableManager(_db.attachedDatabase, _db.machines);
}
