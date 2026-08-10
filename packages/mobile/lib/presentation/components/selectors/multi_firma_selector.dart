import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Razón social disponible en el selector de firmas.
class FirmaRazonSocial {
  const FirmaRazonSocial({
    required this.id,
    required this.name,
    required this.initials,
    this.color = AppColors.primary,
  });

  final String id;
  final String name;

  /// Iniciales que se muestran en el avatar (máx 2 chars).
  final String initials;

  /// Color del avatar y borde cuando está seleccionado.
  final Color color;

  /// Razones sociales predefinidas del grupo Eliggi.
  static const List<FirmaRazonSocial> predefined = [
    FirmaRazonSocial(
      id: 'eliggi',
      name: 'Eliggi',
      initials: 'EL',
      color: Color(0xFF2E6F40),
    ),
    FirmaRazonSocial(
      id: 'eliggi_tufoni',
      name: 'Eliggi Tufoni',
      initials: 'ET',
      color: Color(0xFF795548),
    ),
    FirmaRazonSocial(
      id: 'eliggi_nestor',
      name: 'Eliggi Néstor',
      initials: 'EN',
      color: Color(0xFF0288D1),
    ),
  ];
}

/// Selector visual para alternar entre razones sociales.
///
/// Muestra chips horizontales con avatar de iniciales, nombre
/// y borde de selección. Diseñado para el selector de firma
/// del módulo de partes diarios y documentos.
class MultiFirmaSelector extends StatelessWidget {
  const MultiFirmaSelector({
    super.key,
    required this.razonesSociales,
    this.selectedId,
    this.onSelected,
    this.enabled = true,
  });

  /// Lista de razones sociales disponibles.
  final List<FirmaRazonSocial> razonesSociales;

  /// ID de la razón social actualmente seleccionada.
  final String? selectedId;

  /// Callback al seleccionar una razón social.
  final ValueChanged<FirmaRazonSocial>? onSelected;

  /// Si es false, el selector aparece deshabilitado.
  final bool enabled;

  /// Constructor rápido con las razones sociales predefinidas.
  factory MultiFirmaSelector.predefined({
    String? selectedId,
    ValueChanged<FirmaRazonSocial>? onSelected,
    bool enabled = true,
  }) {
    return MultiFirmaSelector(
      razonesSociales: FirmaRazonSocial.predefined,
      selectedId: selectedId,
      onSelected: onSelected,
      enabled: enabled,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Label ───────────────────────────────────────────────────────
        const Text(
          'Razón social / Firma',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 10),

        // ── Chips de selección ──────────────────────────────────────────
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: razonesSociales.map((razon) {
            final isSelected = selectedId == razon.id;
            return _FirmaChip(
              razon: razon,
              isSelected: isSelected,
              onTap: enabled
                  ? () => onSelected?.call(razon)
                  : null,
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _FirmaChip extends StatelessWidget {
  const _FirmaChip({
    required this.razon,
    required this.isSelected,
    this.onTap,
  });

  final FirmaRazonSocial razon;
  final bool isSelected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? razon.color.withValues(alpha: 0.1)
              : AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? razon.color : AppColors.outlineVariant,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Avatar con iniciales
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: razon.color,
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: Text(
                razon.initials,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Nombre
            Text(
              razon.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? razon.color : AppColors.onSurfaceVariant,
              ),
            ),

            // Check de selección
            if (isSelected) ...[
              const SizedBox(width: 6),
              Icon(
                Icons.check_circle,
                size: 16,
                color: razon.color,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
