import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'inputs_dao.g.dart';

@DriftAccessor(tables: [Inputs])
class InputsDao extends DatabaseAccessor<AppDatabase> with _$InputsDaoMixin {
  InputsDao(AppDatabase db) : super(db);

  Stream<List<Input>> watchAll() {
    return (select(inputs)..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<Input?> getById(String id) {
    return (select(inputs)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
