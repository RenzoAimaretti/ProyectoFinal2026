import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'farms_dao.g.dart';

@DriftAccessor(tables: [Farms])
class FarmsDao extends DatabaseAccessor<AppDatabase> with _$FarmsDaoMixin {
  FarmsDao(AppDatabase db) : super(db);

  Stream<List<Farm>> watchByClient(String clientId) {
    return (select(farms)
          ..where((t) => t.clientId.equals(clientId))
          ..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }
}
