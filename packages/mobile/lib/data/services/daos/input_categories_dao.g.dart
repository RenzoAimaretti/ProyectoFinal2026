// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'input_categories_dao.dart';

// ignore_for_file: type=lint
mixin _$InputCategoriesDaoMixin on DatabaseAccessor<AppDatabase> {
  $InputCategoriesTable get inputCategories => attachedDatabase.inputCategories;
  InputCategoriesDaoManager get managers => InputCategoriesDaoManager(this);
}

class InputCategoriesDaoManager {
  final _$InputCategoriesDaoMixin _db;
  InputCategoriesDaoManager(this._db);
  $$InputCategoriesTableTableManager get inputCategories =>
      $$InputCategoriesTableTableManager(
        _db.attachedDatabase,
        _db.inputCategories,
      );
}
