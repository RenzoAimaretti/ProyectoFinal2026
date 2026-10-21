import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'input_categories_dao.g.dart';

@DriftAccessor(tables: [InputCategories])
class InputCategoriesDao extends DatabaseAccessor<AppDatabase>
    with _$InputCategoriesDaoMixin {
  InputCategoriesDao(AppDatabase db) : super(db);

  Stream<List<InputCategory>> watchAll() =>
      (select(inputCategories)
            ..orderBy([(t) => OrderingTerm.asc(t.name), (t) => OrderingTerm.asc(t.id)]))
          .watch();
}
