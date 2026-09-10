import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/machine_activity.dart';
import '../../presentation/components/empty_state.dart';
import 'machine_activities_view_model.dart';

/// Historial de actividades de maquinaria (CUU08).
///
/// Lista las [MachineActivity] vía `StreamBuilder` sobre el ViewModel. Cada
/// fila muestra máquina (id), tipo y fecha. Al registrar una nueva actividad el
/// `watchAll` la incorpora automáticamente.
///
/// No resuelve el nombre de la máquina: el listado usa `machineId` crudo (mismo
/// criterio que recepciones/partes, que muestran ids sin join).
class MachineActivitiesView extends StatelessWidget {
  const MachineActivitiesView({super.key, required this.viewModel});

  final MachineActivitiesViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<MachineActivity>>(
      stream: viewModel.activities,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final activities = snapshot.data ?? const <MachineActivity>[];
        if (activities.isEmpty) {
          return const EmptyState(
            icon: Icons.agriculture_outlined,
            title: 'Aún no hay actividades de maquinaria',
            subtitle: 'Tocá el botón + para registrar una actividad.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: activities.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            return _ActivityTile(activity: activities[index]);
          },
        );
      },
    );
  }
}

/// Fila de una actividad: máquina (id), tipo y fecha.
class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.activity});

  final MachineActivity activity;

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
          Icons.agriculture_outlined,
          size: 20,
          color: AppColors.primary,
        ),
      ),
      title: Text(
        activity.machineId,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurface,
        ),
      ),
      subtitle: Text(
        '${_typeLabel(activity.type)} · ${_formatDate(activity.date)}',
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.onSurfaceVariant,
        ),
      ),
    );
  }

  static String _typeLabel(MachineActivityType type) {
    switch (type) {
      case MachineActivityType.FUEL:
        return 'Combustible';
      case MachineActivityType.MAINTENANCE:
        return 'Mantenimiento';
      case MachineActivityType.REPAIR:
        return 'Reparación';
      case MachineActivityType.FIELD_USAGE:
        return 'Uso en campo';
    }
  }

  static String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}
