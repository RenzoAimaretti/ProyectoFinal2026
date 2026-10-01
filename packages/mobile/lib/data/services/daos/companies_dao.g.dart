// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'companies_dao.dart';

// ignore_for_file: type=lint
mixin _$CompaniesDaoMixin on DatabaseAccessor<AppDatabase> {
  $CompaniesTable get companies => attachedDatabase.companies;
  CompaniesDaoManager get managers => CompaniesDaoManager(this);
}

class CompaniesDaoManager {
  final _$CompaniesDaoMixin _db;
  CompaniesDaoManager(this._db);
  $$CompaniesTableTableManager get companies =>
      $$CompaniesTableTableManager(_db.attachedDatabase, _db.companies);
}
