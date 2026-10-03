import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/task.dart';
import '../../presentation/components/badges/status_badge.dart';
import '../../presentation/components/buttons/secondary_button.dart';
import '../../presentation/components/empty_state.dart';
import 'tasks_view_model.dart';

/// Pestaña "Tareas" (CUU08, lista).
///
/// Lista las tareas asignadas al operario vía `StreamBuilder` sobre el
/// ViewModel. Tocar una tarea carga el parte diario sobre ella; el botón
/// "Cargar sobre otra tarea" (A4) abre el selector de TODAS las tareas (así el
/// operario puede cargar sobre una tarea no asignada).
class TasksView extends StatelessWidget {
  const TasksView({
    super.key,
    required this.viewModel,
    required this.operatorId,
    required this.onLoadTask,
  });

  final TasksViewModel viewModel;

  /// `userId` de la sesión activa (operario).
  final String operatorId;

  /// Callback al elegir una tarea (asignada o no): abre el parte diario.
  final ValueChanged<Task> onLoadTask;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Task>>(
      stream: viewModel.watchAssignedTo(operatorId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final tasks = snapshot.data ?? const <Task>[];
        return Column(
          children: [
            // Acceso A4: cargar sobre una tarea no asignada.
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: SecondaryButton(
                label: 'Cargar sobre otra tarea',
                icon: Icons.playlist_add,
                isFullWidth: true,
                onPressed: () => showTaskPickerSheet(
                  context: context,
                  viewModel: viewModel,
                  onSelected: onLoadTask,
                ),
              ),
            ),
            Expanded(
              child: tasks.isEmpty
                  ? const EmptyState(
                      icon: Icons.assignment_outlined,
                      title: 'No tenés tareas asignadas',
                      subtitle:
                          'Usá "Cargar sobre otra tarea" o el botón + para '
                          'cargar un parte.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: tasks.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final task = tasks[index];
                        return _TaskTile(
                          task: task,
                          onTap: () => onLoadTask(task),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

/// Abre un selector modal con TODAS las tareas (A4). Al elegir una, cierra el
/// sheet e invoca [onSelected] con la tarea elegida.
Future<void> showTaskPickerSheet({
  required BuildContext context,
  required TasksViewModel viewModel,
  required ValueChanged<Task> onSelected,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) {
      return SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(sheetContext).height * 0.7,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  'Seleccionar tarea',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              Expanded(
                child: StreamBuilder<List<Task>>(
                  stream: viewModel.watchAll(),
                  builder: (context, snapshot) {
                    final tasks = snapshot.data ?? const <Task>[];
                    if (tasks.isEmpty) {
                      return const EmptyState(
                        icon: Icons.assignment_outlined,
                        title: 'No hay tareas disponibles',
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: tasks.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final task = tasks[index];
                        return _TaskTile(
                          task: task,
                          onTap: () {
                            Navigator.pop(sheetContext);
                            onSelected(task);
                          },
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

/// Fila de una tarea: estado, lote/labor (ids, sin join) y chevron de acción.
class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task, required this.onTap});

  final Task task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = task.status;
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
          color: _statusColor(status).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(_statusIcon(status), size: 20, color: _statusColor(status)),
      ),
      title: Text(
        _statusLabel(status),
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurface,
        ),
      ),
      subtitle: Text(
        'Lote ${task.lotId} · Labor ${task.laborTypeId}',
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.onSurfaceVariant,
        ),
      ),
      trailing: _statusBadge(status),
      onTap: onTap,
    );
  }
}

/// Etiqueta legible del estado de la tarea.
String _statusLabel(TaskStatus status) {
  switch (status) {
    case TaskStatus.PENDING:
      return 'Pendiente';
    case TaskStatus.IN_PROGRESS:
      return 'En curso';
    case TaskStatus.COMPLETED:
      return 'Completada';
    case TaskStatus.CANCELLED:
      return 'Cancelada';
  }
}

/// Ícono asociado al estado de la tarea.
IconData _statusIcon(TaskStatus status) {
  switch (status) {
    case TaskStatus.PENDING:
      return Icons.schedule;
    case TaskStatus.IN_PROGRESS:
      return Icons.play_arrow;
    case TaskStatus.COMPLETED:
      return Icons.check_circle;
    case TaskStatus.CANCELLED:
      return Icons.cancel;
  }
}

/// Color asociado al estado de la tarea.
Color _statusColor(TaskStatus status) {
  switch (status) {
    case TaskStatus.PENDING:
      return AppColors.pending;
    case TaskStatus.IN_PROGRESS:
      return AppColors.online;
    case TaskStatus.COMPLETED:
      return AppColors.approved;
    case TaskStatus.CANCELLED:
      return AppColors.offline;
  }
}

/// Badge de estado para la fila de tarea.
StatusBadge _statusBadge(TaskStatus status) {
  switch (status) {
    case TaskStatus.PENDING:
      return StatusBadge.fromType(StatusType.pending);
    case TaskStatus.IN_PROGRESS:
      return const StatusBadge(
        label: 'En curso',
        color: AppColors.online,
        backgroundColor: AppColors.onlineBg,
        icon: Icons.play_arrow,
      );
    case TaskStatus.COMPLETED:
      return const StatusBadge(
        label: 'Completada',
        color: AppColors.approved,
        backgroundColor: AppColors.approvedBg,
        icon: Icons.check_circle,
      );
    case TaskStatus.CANCELLED:
      return const StatusBadge(
        label: 'Cancelada',
        color: AppColors.offline,
        backgroundColor: AppColors.offlineBg,
        icon: Icons.cancel,
      );
  }
}
