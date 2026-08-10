import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../badges/status_badge.dart';

/// Tipo de estado para la recepción de un insumo.
enum InsumoStatus {
  completo('Completo', StatusType.approved),
  sobrante('Sobrante', StatusType.pending),
  faltante('Faltante', StatusType.offline);

  const InsumoStatus(this.label, this.badgeType);

  final String label;
  final StatusType badgeType;
}

/// Tarjeta de recepción de insumos de un cliente.
///
/// Muestra imagen (o placeholder), nombre del cliente, producto,
/// cantidad y badge de estado. Diseñada para la bandeja de
/// recepciones del módulo de insumos.
class InsumoCard extends StatelessWidget {
  const InsumoCard({
    super.key,
    required this.clientName,
    required this.productName,
    required this.quantity,
    required this.status,
    this.imageUrl,
    this.date,
    this.onTap,
  });

  final String clientName;
  final String productName;
  final String quantity;
  final InsumoStatus status;

  /// URL de la imagen del producto. Si es null, muestra placeholder.
  final String? imageUrl;

  /// Fecha de recepción opcional.
  final String? date;

  /// Callback al tocar la tarjeta.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Imagen / Placeholder ─────────────────────────────────
              _buildImage(),
              const SizedBox(width: 12),

              // ── Contenido textual ────────────────────────────────────
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cliente + Badge
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            clientName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        StatusBadge.fromType(status.badgeType),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Producto
                    Text(
                      productName,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    // Cantidad + Fecha
                    Row(
                      children: [
                        Icon(
                          Icons.inventory_2_outlined,
                          size: 14,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          quantity,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        if (date != null) ...[
                          const Spacer(),
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
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    if (imageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          imageUrl!,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        ),
      );
    }
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(
        Icons.agriculture,
        size: 28,
        color: AppColors.outline,
      ),
    );
  }
}
