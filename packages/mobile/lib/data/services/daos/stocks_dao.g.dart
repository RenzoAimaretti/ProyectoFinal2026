// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'stocks_dao.dart';

// ignore_for_file: type=lint
mixin _$StocksDaoMixin on DatabaseAccessor<AppDatabase> {
  $ClientsTable get clients => attachedDatabase.clients;
  $InputsTable get inputs => attachedDatabase.inputs;
  $StocksTable get stocks => attachedDatabase.stocks;
  StocksDaoManager get managers => StocksDaoManager(this);
}

class StocksDaoManager {
  final _$StocksDaoMixin _db;
  StocksDaoManager(this._db);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$InputsTableTableManager get inputs =>
      $$InputsTableTableManager(_db.attachedDatabase, _db.inputs);
  $$StocksTableTableManager get stocks =>
      $$StocksTableTableManager(_db.attachedDatabase, _db.stocks);
}
