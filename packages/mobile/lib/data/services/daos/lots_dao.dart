import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'lots_dao.g.dart';

@DriftAccessor(tables: [Lots])
class LotsDao extends DatabaseAccessor<AppDatabase> with _$LotsDaoMixin {
  LotsDao(AppDatabase db) : super(db);

  Stream<List<Lot>> watchByFarm(String farmId) {
    return (select(lots)
          ..where((t) => t.farmId.equals(farmId))
          ..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<Lot?> getById(String id) {
    return (select(lots)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
