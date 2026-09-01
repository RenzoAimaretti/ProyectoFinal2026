import 'package:drift/drift.dart' show Value;

import '../../domain/models/daily_report.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Fila drift `DailyReport` → modelo de dominio `DailyReport`.
extension DailyReportRowMapper on DailyReport {
  domain.DailyReport toDomain() => domain.DailyReport(
        id: id,
        operatorId: operatorId,
        companyId: companyId,
        lotId: lotId,
        laborTypeId: laborTypeId,
        date: date,
        hectares: hectares,
        hours: hours,
        status: dailyReportStatusFromText(status),
        rejectionReason: rejectionReason,
        approvedAt: approvedAt,
        approvedBy: approvedBy,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

/// Modelo de dominio `DailyReport` → companion drift para insertar.
extension DailyReportDomainMapper on domain.DailyReport {
  DailyReportsCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return DailyReportsCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      operatorId: operatorId,
      companyId: companyId,
      lotId: lotId,
      laborTypeId: laborTypeId,
      date: date,
      hectares: hectares,
      hours: hours,
      status: dailyReportStatusToText(status),
      rejectionReason: Value.absentIfNull(rejectionReason),
      approvedAt: Value.absentIfNull(approvedAt),
      approvedBy: Value.absentIfNull(approvedBy),
      createdAt: Value.absentIfNull(createdAt),
      updatedAt: Value.absentIfNull(updatedAt),
    );
  }
}

/// Fila drift `DailyReportItem` → modelo de dominio `DailyReportItem`.
///
/// El dominio no lleva `id` ni FK al padre: el ítem viaja embebido.
extension DailyReportItemRowMapper on DailyReportItem {
  domain.DailyReportItem toDomain() => domain.DailyReportItem(
        inputId: inputId,
        quantity: quantity,
        unit: unit,
      );
}

/// Modelo de dominio `DailyReportItem` → companion drift para insertar.
extension DailyReportItemDomainMapper on domain.DailyReportItem {
  DailyReportItemsCompanion fromDomain(String dailyReportId) =>
      DailyReportItemsCompanion.insert(
        dailyReportId: dailyReportId,
        inputId: inputId,
        quantity: quantity,
        unit: unit,
      );
}
