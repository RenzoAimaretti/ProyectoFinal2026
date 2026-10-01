import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/reception_summary.dart';
import '../../presentation/components/badges/status_badge.dart';
import '../../presentation/components/empty_state.dart';
import 'receptions_view_model.dart';

/// Bandeja de recepciones de insumos (CUU06), solo lectura.
///
/// Lista TODAS las recepciones (cualquier estado) vía `StreamBuilder` sobre el
/// ViewModel, mostrando el nombre del cliente y su estado (`StatusBadge`). Ya
/// no hay botón "Validar": la validación es responsabilidad del web.
class ReceptionsView extends StatelessWidget {
  const ReceptionsView({super.key, required this.viewModel});

  final ReceptionsViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ReceptionSummary>>(
      stream: viewModel.receptions,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final receptions = snapshot.data ?? const <ReceptionSummary>[];
        if (receptions.isEmpty) {
          return const EmptyState(
            icon: Icons.inventory_2_outlined,
            title: 'Aún no hay recepciones',
            subtitle: 'Tocá el botón + para registrar una recepción.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: receptions.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) =>
              _ReceptionTile(reception: receptions[index]),
        );
      },
    );
  }
}

/// Fila de una recepción: nombre de cliente, fecha y estado.
class _ReceptionTile extends StatelessWidget {
  const _ReceptionTile({required this.reception});

  final ReceptionSummary reception;

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
          Icons.inventory_2_outlined,
          size: 20,
          color: AppColors.primary,
        ),
      ),
      title: Text(
        reception.clientName,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurface,
        ),
      ),
      subtitle: Text(
        _formatDate(reception.date),
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.onSurfaceVariant,
        ),
      ),
      trailing: _statusBadge(reception.status),
    );
  }

  StatusBadge _statusBadge(ReceptionStatus status) {
    switch (status) {
      case ReceptionStatus.VALIDATED:
        return const StatusBadge(
          label: 'Validada',
          color: AppColors.approved,
          backgroundColor: AppColors.approvedBg,
          icon: Icons.check_circle,
        );
      case ReceptionStatus.REJECTED:
        return const StatusBadge(
          label: 'Rechazada',
          color: AppColors.offline,
          backgroundColor: AppColors.offlineBg,
          icon: Icons.cancel,
        );
      case ReceptionStatus.PENDING_VALIDATION:
        return StatusBadge.fromType(StatusType.pending);
    }
  }

  static String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}
