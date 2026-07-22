import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Tarjeta de KPI / Métrica del Design System Agropecuario.
///
/// Muestra un título, valor numérico destacado, unidad de medida,
/// ícono temático y opcionalmente un trend de variación.
class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.title,
    required this.value,
    required this.unit,
    required this.icon,
    this.iconColor = AppColors.primary,
    this.trend,
    this.trendIsPositive,
  });

  final String title;
  final String value;
  final String unit;
  final IconData icon;
  final Color iconColor;

  /// Texto del trend, ej: "+12%" o "-5%".
  final String? trend;

  /// true = subió (verde), false = bajó (rojo), null = sin trend.
  final bool? trendIsPositive;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Fila superior: Ícono + Trend ─────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: iconColor, size: 24),
                ),
                if (trend != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: trendIsPositive == true
                          ? AppColors.approvedBg
                          : AppColors.offlineBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          trendIsPositive == true
                              ? Icons.trending_up
                              : Icons.trending_down,
                          size: 14,
                          color: trendIsPositive == true
                              ? AppColors.approved
                              : AppColors.offline,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          trend!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: trendIsPositive == true
                                ? AppColors.approved
                                : AppColors.offline,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Valor destacado ──────────────────────────────────────────
            Text(
              value,
              style: textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 2),

            // ── Unidad ───────────────────────────────────────────────────
            Text(
              unit,
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),

            // ── Título ───────────────────────────────────────────────────
            Text(
              title,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
