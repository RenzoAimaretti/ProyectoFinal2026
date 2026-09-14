import 'dart:async';

import '../models/daily_report.dart';
import '../models/daily_report_summary.dart';
import '../models/enums.dart';

/// Persistencia de partes diarios (CUU05).
abstract class DailyReportRepository {
  /// Crea cabecera + ítems en una única transacción y devuelve el `id`
  /// generado para el parte (necesario para asociar las fotos — R008).
  Future<String> create(DailyReport report, List<DailyReportItem> items);

  Stream<List<DailyReport>> watchPending();

  Stream<List<DailyReport>> watchByFilter({
    DailyReportStatus? status,
    DateTime? from,
    DateTime? to,
  });

  /// Partes diarios de una firma/razón social específica (multi-firma).
  Stream<List<DailyReport>> watchByCompany(String companyId);

  /// Partes diarios con `lotName`/`laborName` resueltos para listados (D2).
  /// `companyId == null` devuelve todas las firmas.
  Stream<List<DailyReportSummary>> watchSummaries({String? companyId});

  /// Aprobación/rechazo. `approvedBy` aplica a APPROVED; `rejectionReason` a
  /// REJECTED. `approvedAt` lo resuelve el adaptador.
  Future<void> updateStatus(
    String id,
    DailyReportStatus status, {
    String? rejectionReason,
    String? approvedBy,
  });
}
