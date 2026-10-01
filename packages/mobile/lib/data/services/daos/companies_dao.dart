import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'companies_dao.g.dart';

@DriftAccessor(tables: [Companies])
class CompaniesDao extends DatabaseAccessor<AppDatabase>
    with _$CompaniesDaoMixin {
  CompaniesDao(AppDatabase db) : super(db);

  Stream<List<Company>> watchAll() {
    return (select(companies)..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<Company?> getById(String id) {
    return (select(companies)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
