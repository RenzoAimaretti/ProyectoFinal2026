import 'dart:async';

import '../models/daily_report.dart';
import '../models/enums.dart';

/// Persistencia de partes diarios (CUU05).
abstract class DailyReportRepository {
  /// Crea cabecera + ítems en una única transacción.
  Future<void> create(DailyReport report, List<DailyReportItem> items);

  Stream<List<DailyReport>> watchPending();

  Stream<List<DailyReport>> watchByFilter({
    DailyReportStatus? status,
    DateTime? from,
    DateTime? to,
  });

  /// Aprobación/rechazo. `approvedBy` aplica a APPROVED; `rejectionReason` a
  /// REJECTED. `approvedAt` lo resuelve el adaptador.
  Future<void> updateStatus(
    String id,
    DailyReportStatus status, {
    String? rejectionReason,
    String? approvedBy,
  });
}
