import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/stock_tables.dart';

part 'receptions_dao.g.dart';

@DriftAccessor(tables: [Receptions])
class ReceptionsDao extends DatabaseAccessor<AppDatabase>
    with _$ReceptionsDaoMixin {
  ReceptionsDao(AppDatabase db) : super(db);

  Stream<List<Reception>> watchPending() {
    return (select(receptions)
          ..where((t) => t.status.equals('PENDING_VALIDATION'))
          ..orderBy([(t) => OrderingTerm.asc(t.date)]))
        .watch();
  }
}
