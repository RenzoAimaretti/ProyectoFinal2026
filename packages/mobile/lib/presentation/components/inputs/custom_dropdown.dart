import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Dropdown estandarizado del Design System Agropecuario.
///
/// Muestra un label arriba del campo, un trigger con el valor
/// seleccionado (o placeholder) y un ícono de expandir.
/// Funciona como wrapper de `DropdownButtonFormField` M3 con
/// estilo consistente con `CustomTextField`.
class CustomDropdown<T> extends StatelessWidget {
  const CustomDropdown({
    super.key,
    required this.label,
    required this.items,
    this.value,
    this.hint = 'Seleccionar...',
    this.onChanged,
    this.enabled = true,
    this.prefixIcon,
    this.errorText,
  });

  /// Etiqueta que aparece arriba del campo.
  final String label;

  /// Lista de opciones del dropdown.
  final List<DropdownMenuItem<T>> items;

  /// Valor actualmente seleccionado.
  final T? value;

  /// Texto placeholder cuando no hay selección.
  final String hint;

  /// Callback al seleccionar un ítem.
  final ValueChanged<T?>? onChanged;

  /// Si es false, el campo aparece deshabilitado.
  final bool enabled;

  /// Ícono al inicio del trigger.
  final IconData? prefixIcon;

  /// Mensaje de error que aparece debajo del campo.
  final String? errorText;

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
        const SizedBox(height: 6),

        // ── Dropdown ────────────────────────────────────────────────────
        DropdownButtonFormField<T>(
          initialValue: value,
          items: items,
          onChanged: enabled ? onChanged : null,
          isExpanded: true,
          icon: const Icon(
            Icons.keyboard_arrow_down_rounded,
            color: AppColors.onSurfaceVariant,
          ),
          style: const TextStyle(
            fontSize: 15,
            color: AppColors.onSurface,
          ),
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: enabled
                ? AppColors.surfaceContainer
                : AppColors.surfaceContainerHigh,
            prefixIcon: prefixIcon != null
                ? Icon(
                    prefixIcon,
                    size: 20,
                    color: AppColors.onSurfaceVariant,
                  )
                : null,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.outline),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 2,
              ),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.outlineVariant),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.offline),
            ),
            errorText: errorText,
          ),
          dropdownColor: AppColors.surface,
        ),
      ],
    );
  }
}
