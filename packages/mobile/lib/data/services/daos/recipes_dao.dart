import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/production_tables.dart';

part 'recipes_dao.g.dart';

@DriftAccessor(tables: [Recipes])
class RecipesDao extends DatabaseAccessor<AppDatabase> with _$RecipesDaoMixin {
  RecipesDao(AppDatabase db) : super(db);

  Stream<List<Recipe>> watchByLot(String lotId) {
    return (select(recipes)
          ..where((t) => t.lotId.equals(lotId))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  Future<Recipe?> getById(String id) {
    return (select(recipes)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
