import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/daily_report.dart';
import '../../domain/models/enums.dart';
import '../../presentation/components/badges/status_badge.dart';
import '../../presentation/components/empty_state.dart';
import 'daily_reports_view_model.dart';

/// Bandeja de partes diarios (CUU05).
///
/// Lista los [DailyReport] vía `StreamBuilder` sobre el ViewModel. El lote se
/// muestra por su `id` (el listado no resuelve nombres de lote — eso requiere
/// un join que no expone `ListDailyReportsUseCase`); fecha, hectáreas y estado
/// salen directo del modelo.
class DailyReportsView extends StatelessWidget {
  const DailyReportsView({super.key, required this.viewModel});

  final DailyReportsViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    // ListenableBuilder resuscribe el StreamBuilder cuando cambia la firma
    // activa (el ViewModel notifica y `reports` devuelve un stream nuevo).
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, _) {
        return StreamBuilder<List<DailyReport>>(
          stream: viewModel.reports,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                !snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            final reports = snapshot.data ?? const <DailyReport>[];
            if (reports.isEmpty) {
              return const EmptyState(
                icon: Icons.assignment_outlined,
                title: 'Aún no hay partes diarios',
                subtitle: 'Tocá el botón + para cargar tu primer parte.',
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: reports.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) =>
                  _DailyReportTile(report: reports[index]),
            );
          },
        );
      },
    );
  }
}

/// Fila de un parte: lote, fecha, hectáreas y estado.
class _DailyReportTile extends StatelessWidget {
  const _DailyReportTile({required this.report});

  final DailyReport report;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      tileColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.outlineVariant),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(
          Icons.landscape,
          size: 20,
          color: AppColors.primary,
        ),
      ),
      title: Text(
        report.lotId,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurface,
        ),
      ),
      subtitle: Text(
        '${_formatDate(report.date)} · ${_formatHa(report.hectares)}',
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.onSurfaceVariant,
        ),
      ),
      trailing: _statusBadge(report.status),
    );
  }

  StatusBadge _statusBadge(DailyReportStatus status) {
    switch (status) {
      case DailyReportStatus.APPROVED:
        return StatusBadge.fromType(StatusType.approved);
      case DailyReportStatus.REJECTED:
        return const StatusBadge(
          label: 'Rechazado',
          color: AppColors.offline,
          backgroundColor: AppColors.offlineBg,
          icon: Icons.cancel,
        );
      case DailyReportStatus.PENDING_APPROVAL:
        return StatusBadge.fromType(StatusType.pending);
    }
  }

  static String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }

  static String _formatHa(double value) {
    // 120.0 → "120 ha"; 12.5 → "12.5 ha".
    final text = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toString();
    return '$text ha';
  }
}
