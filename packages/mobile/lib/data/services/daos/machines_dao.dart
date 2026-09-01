import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/catalog_tables.dart';

part 'machines_dao.g.dart';

@DriftAccessor(tables: [Machines])
class MachinesDao extends DatabaseAccessor<AppDatabase> with _$MachinesDaoMixin {
  MachinesDao(AppDatabase db) : super(db);

  Stream<List<Machine>> watchByCompany(String companyId) {
    return (select(machines)
          ..where((t) => t.companyId.equals(companyId))
          ..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .watch();
  }

  Future<Machine?> getById(String id) {
    return (select(machines)..where((t) => t.id.equals(id))).getSingleOrNull();
  }
}
