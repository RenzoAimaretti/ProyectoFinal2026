// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'labor_types_dao.dart';

// ignore_for_file: type=lint
mixin _$LaborTypesDaoMixin on DatabaseAccessor<AppDatabase> {
  $LaborTypesTable get laborTypes => attachedDatabase.laborTypes;
  LaborTypesDaoManager get managers => LaborTypesDaoManager(this);
}

class LaborTypesDaoManager {
  final _$LaborTypesDaoMixin _db;
  LaborTypesDaoManager(this._db);
  $$LaborTypesTableTableManager get laborTypes =>
      $$LaborTypesTableTableManager(_db.attachedDatabase, _db.laborTypes);
}
