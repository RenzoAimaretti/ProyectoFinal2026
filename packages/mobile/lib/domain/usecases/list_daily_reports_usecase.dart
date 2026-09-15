import 'dart:async';

import '../models/daily_report.dart';
import '../models/enums.dart';
import '../repositories/daily_report_repository.dart';

/// CUU05: lista de partes diarios con filtro por estado/fecha (stream).
class ListDailyReportsUseCase {
  ListDailyReportsUseCase(this._repository);

  final DailyReportRepository _repository;

  Stream<List<DailyReport>> execute({
    DailyReportStatus? status,
    DateTime? from,
    DateTime? to,
  }) {
    return _repository.watchByFilter(status: status, from: from, to: to);
  }

  /// CUU05 (multi-firma): partes de la firma activa; `null` = todos (sin
  /// filtro de firma).
  Stream<List<DailyReport>> watchByCompany(String? companyId) {
    if (companyId == null) {
      return _repository.watchByFilter();
    }
    return _repository.watchByCompany(companyId);
  }
}
