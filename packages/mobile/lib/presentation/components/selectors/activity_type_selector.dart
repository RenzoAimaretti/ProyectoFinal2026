import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/models/enums.dart';

/// Descripción visual de un tipo de actividad de maquinaria.
class ActivityTypeOption {
  const ActivityTypeOption({
    required this.type,
    required this.label,
    required this.icon,
  });

  final MachineActivityType type;
  final String label;
  final IconData icon;
}

/// Opciones del selector de tipo de actividad (CUU08).
///
/// Orden estable según el enum de dominio y etiquetas en español.
const List<ActivityTypeOption> activityTypeOptions = [
  ActivityTypeOption(
    type: MachineActivityType.FUEL,
    label: 'Combustible',
    icon: Icons.local_gas_station,
  ),
  ActivityTypeOption(
    type: MachineActivityType.MAINTENANCE,
    label: 'Mantenimiento',
    icon: Icons.build,
  ),
  ActivityTypeOption(
    type: MachineActivityType.REPAIR,
    label: 'Reparación',
    icon: Icons.construction,
  ),
  ActivityTypeOption(
    type: MachineActivityType.FIELD_USAGE,
    label: 'Uso en campo',
    icon: Icons.agriculture,
  ),
];

/// Selector del tipo de actividad de maquinaria.
///
/// Usa un [Wrap] de [ChoiceChip]s (Material 3) para que las 4 opciones
/// se acomoden bien en ancho móvil. Expone `selected` y `onChanged` para
/// que el formulario CUU08 reaccione dinámicamente al tipo elegido.
class ActivityTypeSelector extends StatelessWidget {
  const ActivityTypeSelector({
    super.key,
    this.selected,
    this.onChanged,
    this.enabled = true,
    this.label = 'Tipo de actividad',
  });

  /// Tipo actualmente seleccionado (puede ser null si aún no se eligió).
  final MachineActivityType? selected;

  /// Callback al seleccionar un tipo.
  final ValueChanged<MachineActivityType>? onChanged;

  /// Si es false, los chips aparecen deshabilitados.
  final bool enabled;

  /// Etiqueta que aparece arriba del grupo de chips.
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Label ───────────────────────────────────────────────────────
        Text(
          label,
          style: const TextStyle(
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
          children: activityTypeOptions.map((option) {
            final isSelected = selected == option.type;
            return ChoiceChip(
              selected: isSelected,
              onSelected: enabled
                  ? (_) => onChanged?.call(option.type)
                  : null,
              showCheckmark: false,
              avatar: Icon(
                option.icon,
                size: 18,
                color: isSelected
                    ? AppColors.primary
                    : AppColors.onSurfaceVariant,
              ),
              label: Text(option.label),
              labelStyle: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
              ),
              backgroundColor: AppColors.surfaceContainer,
              selectedColor: AppColors.primaryContainer,
              side: BorderSide(
                color: isSelected ? AppColors.primary : AppColors.outlineVariant,
                width: isSelected ? 2 : 1,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            );
          }).toList(),
        ),
      ],
    );
  }
}
