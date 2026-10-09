// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inputs_dao.dart';

// ignore_for_file: type=lint
mixin _$InputsDaoMixin on DatabaseAccessor<AppDatabase> {
  $InputCategoriesTable get inputCategories => attachedDatabase.inputCategories;
  $InputsTable get inputs => attachedDatabase.inputs;
  InputsDaoManager get managers => InputsDaoManager(this);
}

class InputsDaoManager {
  final _$InputsDaoMixin _db;
  InputsDaoManager(this._db);
  $$InputCategoriesTableTableManager get inputCategories =>
      $$InputCategoriesTableTableManager(
        _db.attachedDatabase,
        _db.inputCategories,
      );
  $$InputsTableTableManager get inputs =>
      $$InputsTableTableManager(_db.attachedDatabase, _db.inputs);
}
