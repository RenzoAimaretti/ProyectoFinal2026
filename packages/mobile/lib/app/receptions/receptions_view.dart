import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/reception.dart';
import '../../presentation/components/empty_state.dart';
import 'receptions_view_model.dart';

/// Bandeja de recepciones de insumos (CUU06).
///
/// Lista las [Reception] pendientes de validación vía `StreamBuilder` sobre el
/// ViewModel y expone una acción "Validar" por fila que delega en
/// `ValidateReceptionUseCase`. Al validar, la recepción deja de ser pendiente
/// y el `watch` la retira de la lista automáticamente.
///
/// El listado no resuelve el nombre del cliente: `ListPendingReceptionsUseCase`
/// no expone un join y el modelo solo trae `clientId` (mismo criterio que el
/// listado de partes, que muestra el `lotId` crudo).
class ReceptionsView extends StatelessWidget {
  const ReceptionsView({
    super.key,
    required this.viewModel,
    required this.operatorId,
  });

  final ReceptionsViewModel viewModel;

  /// `userId` de la sesión activa, registrado como `validatedBy` (R017).
  final String operatorId;

  Future<void> _validate(BuildContext context, Reception reception) async {
    final id = reception.id;
    if (id == null) return;

    try {
      await viewModel.validate(id, validatedBy: operatorId);
    } catch (e) {
      if (!context.mounted) return;
      final message = e.toString().replaceAll('Exception: ', '');
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Reception>>(
      stream: viewModel.pendingReceptions,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final receptions = snapshot.data ?? const <Reception>[];
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
          itemBuilder: (context, index) {
            final reception = receptions[index];
            return _ReceptionTile(
              reception: reception,
              onValidate: () => _validate(context, reception),
            );
          },
        );
      },
    );
  }
}

/// Fila de una recepción pendiente: cliente, fecha y acción "Validar".
class _ReceptionTile extends StatelessWidget {
  const _ReceptionTile({required this.reception, required this.onValidate});

  final Reception reception;
  final VoidCallback onValidate;

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
        reception.clientId,
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
      trailing: TextButton.icon(
        onPressed: onValidate,
        icon: const Icon(Icons.check_circle_outline, size: 18),
        label: const Text('Validar'),
      ),
    );
  }

  static String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}
