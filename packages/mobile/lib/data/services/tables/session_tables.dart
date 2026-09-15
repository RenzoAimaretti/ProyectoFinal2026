import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

/// Sesión local. Sin FK (decisión D8): el login ocurre antes del seed de
/// catálogos, por lo que una FK rompería el insert.
@DataClassName('SessionRow')
class Sessions extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get userId => text()();
  TextColumn get email => text()();
  TextColumn get fullName => text()();
  TextColumn get role => text()();
  TextColumn get token => text()();
  TextColumn get companyId => text().nullable()();
  DateTimeColumn get lastAccessedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
