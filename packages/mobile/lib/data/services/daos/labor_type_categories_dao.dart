import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'labor_type_categories_dao.g.dart';

@DriftAccessor(tables: [LaborTypeCategories])
class LaborTypeCategoriesDao extends DatabaseAccessor<AppDatabase>
    with _$LaborTypeCategoriesDaoMixin {
  LaborTypeCategoriesDao(AppDatabase db) : super(db);

  Stream<Set<String>> watchCategoryIds(String laborTypeId) =>
      (select(laborTypeCategories)
            ..where((t) => t.laborTypeId.equals(laborTypeId))
            ..orderBy([(t) => OrderingTerm.asc(t.categoryId)]))
          .watch()
          .map((rows) => rows.map((row) => row.categoryId).toSet());
}
