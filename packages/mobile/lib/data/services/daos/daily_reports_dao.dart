import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/production_tables.dart';

part 'daily_reports_dao.g.dart';

/// Fila de join `DailyReports ⋈ Lots ⋈ LaborTypes` para listados con nombres.
class DailyReportSummaryRow {
  const DailyReportSummaryRow({
    required this.id,
    required this.lotId,
    required this.lotName,
    required this.laborName,
    required this.date,
    required this.hectares,
    required this.status,
  });

  final String id;
  final String lotId;
  final String lotName;
  final String laborName;
  final DateTime date;
  final double hectares;
  final String status;
}

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

  Stream<List<DailyReport>> watchByCompany(String companyId) {
    return (select(dailyReports)
          ..where((t) => t.companyId.equals(companyId))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  /// Partes diarios con `lotName`/`laborName` resueltos (join D2).
  Stream<List<DailyReportSummaryRow>> watchSummaries({String? companyId}) {
    final query = select(dailyReports).join([
      innerJoin(lots, lots.id.equalsExp(dailyReports.lotId)),
      innerJoin(laborTypes, laborTypes.id.equalsExp(dailyReports.laborTypeId)),
    ]);
    if (companyId != null) {
      query.where(dailyReports.companyId.equals(companyId));
    }
    query.orderBy([OrderingTerm.desc(dailyReports.date)]);
    return query.map((row) {
      final report = row.readTable(dailyReports);
      return DailyReportSummaryRow(
        id: report.id,
        lotId: report.lotId,
        lotName: row.readTable(lots).name,
        laborName: row.readTable(laborTypes).name,
        date: report.date,
        hectares: report.hectares,
        status: report.status,
      );
    }).watch();
  }
}
