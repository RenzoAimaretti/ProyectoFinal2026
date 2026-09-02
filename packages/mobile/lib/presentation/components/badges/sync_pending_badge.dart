import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Badge "pendientes de sincronización" (design §7).
///
/// Componente standalone y reutilizable: recibe un [Stream<int>] con la
/// cantidad de filas `PENDING` en `SyncQueue` y no importa drift ni la base.
/// Cuando no hay pendientes no renderiza nada.
class SyncPendingBadge extends StatelessWidget {
  const SyncPendingBadge({super.key, required this.pendingCount});

  final Stream<int> pendingCount;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: pendingCount,
      builder: (context, snapshot) {
        final count = snapshot.data ?? 0;
        if (count <= 0) {
          return const SizedBox.shrink();
        }
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: AppColors.pendingBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.pending.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.sync_rounded,
                size: 14,
                color: AppColors.pending,
              ),
              const SizedBox(width: 4),
              Text(
                '$count pendiente${count == 1 ? '' : 's'}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.pending,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
