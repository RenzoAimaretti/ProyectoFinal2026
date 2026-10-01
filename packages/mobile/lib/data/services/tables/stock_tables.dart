import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'catalog_tables.dart';

/// Insumos / Stock (CUU06).
@TableIndex(name: 'idx_receptions_client_id', columns: {#clientId})
@TableIndex(name: 'idx_receptions_status', columns: {#status})
@DataClassName('Reception')
class Receptions extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get clientId => text().references(Clients, #id)();
  DateTimeColumn get date => dateTime()();
  TextColumn get status => text()();
  TextColumn get rejectionReason => text().nullable()();
  TextColumn get validatedBy => text().nullable()();
  DateTimeColumn get validatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(name: 'idx_reception_items_reception_id', columns: {#receptionId})
@DataClassName('ReceptionItem')
class ReceptionItems extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get receptionId =>
      text().references(Receptions, #id, onDelete: KeyAction.cascade)();
  TextColumn get inputId => text().references(Inputs, #id)();
  RealColumn get quantity => real()();
  TextColumn get unit => text()();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(
  name: 'unique_stocks_client_input',
  unique: true,
  columns: {#clientId, #inputId},
)
@DataClassName('Stock')
class Stocks extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get clientId => text().references(Clients, #id)();
  TextColumn get inputId => text().references(Inputs, #id)();
  RealColumn get quantity => real()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
