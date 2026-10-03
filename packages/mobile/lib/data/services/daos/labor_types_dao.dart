import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'labor_types_dao.g.dart';

@DriftAccessor(tables: [LaborTypes])
class LaborTypesDao extends DatabaseAccessor<AppDatabase>
    with _$LaborTypesDaoMixin {
  LaborTypesDao(AppDatabase db) : super(db);

  Stream<List<LaborType>> watchAll() {
    return (select(laborTypes)..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<LaborType?> getById(String id) {
    return (select(laborTypes)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }
}
