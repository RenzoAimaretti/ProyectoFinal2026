// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'labor_type_categories_dao.dart';

// ignore_for_file: type=lint
mixin _$LaborTypeCategoriesDaoMixin on DatabaseAccessor<AppDatabase> {
  $LaborTypesTable get laborTypes => attachedDatabase.laborTypes;
  $InputCategoriesTable get inputCategories => attachedDatabase.inputCategories;
  $LaborTypeCategoriesTable get laborTypeCategories =>
      attachedDatabase.laborTypeCategories;
  LaborTypeCategoriesDaoManager get managers =>
      LaborTypeCategoriesDaoManager(this);
}

class LaborTypeCategoriesDaoManager {
  final _$LaborTypeCategoriesDaoMixin _db;
  LaborTypeCategoriesDaoManager(this._db);
  $$LaborTypesTableTableManager get laborTypes =>
      $$LaborTypesTableTableManager(_db.attachedDatabase, _db.laborTypes);
  $$InputCategoriesTableTableManager get inputCategories =>
      $$InputCategoriesTableTableManager(
        _db.attachedDatabase,
        _db.inputCategories,
      );
  $$LaborTypeCategoriesTableTableManager get laborTypeCategories =>
      $$LaborTypeCategoriesTableTableManager(
        _db.attachedDatabase,
        _db.laborTypeCategories,
      );
}
