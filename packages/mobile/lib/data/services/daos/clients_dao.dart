import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'clients_dao.g.dart';

@DriftAccessor(tables: [Clients])
class ClientsDao extends DatabaseAccessor<AppDatabase> with _$ClientsDaoMixin {
  ClientsDao(AppDatabase db) : super(db);

  Stream<List<Client>> watchAll() {
    return (select(clients)..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<Client?> getById(String id) {
    return (select(clients)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
