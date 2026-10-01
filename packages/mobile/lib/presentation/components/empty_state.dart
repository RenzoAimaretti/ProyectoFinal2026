import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'buttons/primary_button.dart';

/// Estado vacío reutilizable del Design System Agropecuario.
///
/// Ícono grande en círculo gris + título + subtítulo opcional y un
/// botón de acción opcional. Se usa para listas/pantallas sin datos
/// (partes, recepciones, maquinaria, etc.).
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  /// Ícono grande que se muestra atenuado.
  final IconData icon;

  final String title;
  final String? subtitle;

  /// Etiqueta del botón de acción (si se omite, no se muestra el botón).
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: const BoxDecoration(
                color: AppColors.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: AppColors.outline),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              PrimaryButton(
                label: actionLabel!,
                onPressed: onAction,
                isFullWidth: true,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
