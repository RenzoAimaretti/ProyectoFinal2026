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
}
