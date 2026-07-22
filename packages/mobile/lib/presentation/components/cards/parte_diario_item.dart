import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Fila optimizada para la bandeja de partes diarios de operarios.
///
/// Muestra lote, cliente, hectáreas, indicador de foto adjunta
/// y botones rápidos de acción (Aprobar / Rechazar).
class ParteDiarioItem extends StatelessWidget {
  const ParteDiarioItem({
    super.key,
    required this.lote,
    required this.clientName,
    required this.hectareas,
    this.hasPhoto = false,
    this.date,
    this.onApprove,
    this.onReject,
    this.isApproved,
  });

  final String lote;
  final String clientName;
  final String hectareas;

  /// Indica si el parte tiene foto adjunta disponible.
  final bool hasPhoto;

  /// Fecha del parte.
  final String? date;

  /// Callback al presionar Aprobar.
  final VoidCallback? onApprove;

  /// Callback al presionar Rechazar.
  final VoidCallback? onReject;

  /// Estado de aprobación: null = pendiente, true = aprobado, false = rechazado.
  final bool? isApproved;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Fila principal: Info + Foto ──────────────────────────────
            Row(
              children: [
                // Icono del lote
                Container(
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
                const SizedBox(width: 10),

                // Info del parte
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Lote
                      Text(
                        lote,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      // Cliente
                      Text(
                        clientName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Indicador de foto
                if (hasPhoto)
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.camera_alt,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.photo_camera_outlined,
                      size: 16,
                      color: AppColors.outline,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            // ── Fila inferior: Hectáreas + Fecha + Botones ──────────────
            Row(
              children: [
                // Hectáreas
                Icon(
                  Icons.straighten,
                  size: 13,
                  color: AppColors.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  '$hectareas ha',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),

                // Fecha
                if (date != null) ...[
                  const SizedBox(width: 12),
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 12,
                    color: AppColors.outline,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    date!,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.outline,
                    ),
                  ),
                ],

                const Spacer(),

                // Botones de acción (solo si está pendiente)
                if (isApproved == null) ...[
                  // Rechazar
                  SizedBox(
                    height: 32,
                    child: IconButton(
                      onPressed: onReject,
                      icon: const Icon(Icons.close, size: 18),
                      style: IconButton.styleFrom(
                        foregroundColor: AppColors.offline,
                        backgroundColor: AppColors.offlineBg,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      tooltip: 'Rechazar',
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Aprobar
                  SizedBox(
                    height: 32,
                    child: IconButton(
                      onPressed: onApprove,
                      icon: const Icon(Icons.check, size: 18),
                      style: IconButton.styleFrom(
                        foregroundColor: AppColors.approved,
                        backgroundColor: AppColors.approvedBg,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      tooltip: 'Aprobar',
                    ),
                  ),
                ] else ...[
                  // Estado ya decidido
                  Icon(
                    isApproved == true
                        ? Icons.check_circle
                        : Icons.cancel,
                    size: 20,
                    color: isApproved == true
                        ? AppColors.approved
                        : AppColors.offline,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
