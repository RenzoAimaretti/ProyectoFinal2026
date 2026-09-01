// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receptions_dao.dart';

// ignore_for_file: type=lint
mixin _$ReceptionsDaoMixin on DatabaseAccessor<AppDatabase> {
  $ClientsTable get clients => attachedDatabase.clients;
  $ReceptionsTable get receptions => attachedDatabase.receptions;
  ReceptionsDaoManager get managers => ReceptionsDaoManager(this);
}

class ReceptionsDaoManager {
  final _$ReceptionsDaoMixin _db;
  ReceptionsDaoManager(this._db);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$ReceptionsTableTableManager get receptions =>
      $$ReceptionsTableTableManager(_db.attachedDatabase, _db.receptions);
}
