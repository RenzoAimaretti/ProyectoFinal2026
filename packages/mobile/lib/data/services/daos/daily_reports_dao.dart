import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/production_tables.dart';

part 'daily_reports_dao.g.dart';

@DriftAccessor(tables: [DailyReports])
class DailyReportsDao extends DatabaseAccessor<AppDatabase>
    with _$DailyReportsDaoMixin {
  DailyReportsDao(AppDatabase db) : super(db);

  Stream<List<DailyReport>> watchPending() {
    return (select(dailyReports)
          ..where((t) => t.status.equals('PENDING_APPROVAL'))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  Stream<List<DailyReport>> watchByFilter({
    String? status,
    DateTime? from,
    DateTime? to,
  }) {
    return (select(dailyReports)
          ..where((t) {
            Expression<bool> predicate = const Constant(true);
            if (status != null) {
              predicate = predicate & t.status.equals(status);
            }
            if (from != null) {
              predicate = predicate & t.date.isBiggerOrEqualValue(from);
            }
            if (to != null) {
              predicate = predicate & t.date.isSmallerOrEqualValue(to);
            }
            return predicate;
          })
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }
}
