import 'dart:async';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/models/daily_report.dart' as domain;
import '../../domain/models/enums.dart';
import '../../domain/repositories/daily_report_repository.dart';
import '../models/daily_report_mapper.dart';
import '../services/app_database.dart';
import 'sync_queue_writer.dart';

/// Persistencia de partes diarios (CUU05) en drift.
class DriftDailyReportRepository implements DailyReportRepository {
  DriftDailyReportRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> create(
    domain.DailyReport report,
    List<domain.DailyReportItem> items,
  ) {
    return _db.transaction(() async {
      final id = report.id ?? const Uuid().v4();
      await _db.into(_db.dailyReports).insert(report.fromDomain(id: id));

      for (final item in items) {
        await _db.into(_db.dailyReportItems).insert(item.fromDomain(id));
      }

      await enqueueSync(
        db: _db,
        entity: SyncEntity.dailyReport,
        entityId: id,
      );
    });
  }

  @override
  Stream<List<domain.DailyReport>> watchPending() {
    return _db.dailyReportsDao
        .watchPending()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<domain.DailyReport>> watchByFilter({
    DailyReportStatus? status,
    DateTime? from,
    DateTime? to,
  }) {
    return _db.dailyReportsDao
        .watchByFilter(status: status?.name, from: from, to: to)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Future<void> updateStatus(
    String id,
    DailyReportStatus status, {
    String? rejectionReason,
    String? approvedBy,
  }) {
    final now = DateTime.now();
    return (_db.update(_db.dailyReports)..where((t) => t.id.equals(id))).write(
          DailyReportsCompanion(
            status: Value(status.name),
            rejectionReason: Value(rejectionReason),
            approvedBy: Value(approvedBy),
            approvedAt:
                Value(status == DailyReportStatus.APPROVED ? now : null),
            updatedAt: Value(now),
          ),
        );
  }
}
