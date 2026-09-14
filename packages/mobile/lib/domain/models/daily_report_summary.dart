import 'enums.dart';

/// Resumen de parte diario para listados con nombres resueltos
/// (`DailyReports ⋈ Lots ⋈ LaborTypes`).
class DailyReportSummary {
  const DailyReportSummary({
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
  final DailyReportStatus status;
}
