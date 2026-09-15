// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lots_dao.dart';

// ignore_for_file: type=lint
mixin _$LotsDaoMixin on DatabaseAccessor<AppDatabase> {
  $ClientsTable get clients => attachedDatabase.clients;
  $FarmsTable get farms => attachedDatabase.farms;
  $LotsTable get lots => attachedDatabase.lots;
  LotsDaoManager get managers => LotsDaoManager(this);
}

class LotsDaoManager {
  final _$LotsDaoMixin _db;
  LotsDaoManager(this._db);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$FarmsTableTableManager get farms =>
      $$FarmsTableTableManager(_db.attachedDatabase, _db.farms);
  $$LotsTableTableManager get lots =>
      $$LotsTableTableManager(_db.attachedDatabase, _db.lots);
}
