import '../../domain/models/daily_report_summary.dart' as domain;
import '../services/daos/daily_reports_dao.dart';
import 'enum_converters.dart';

/// Fila de join `DailyReportSummaryRow` → modelo `DailyReportSummary`.
extension DailyReportSummaryRowMapper on DailyReportSummaryRow {
  domain.DailyReportSummary toDomain() => domain.DailyReportSummary(
        id: id,
        lotId: lotId,
        lotName: lotName,
        laborName: laborName,
        date: date,
        hectares: hectares,
        status: dailyReportStatusFromText(status),
      );
}
