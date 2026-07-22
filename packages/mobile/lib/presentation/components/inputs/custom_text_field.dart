import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Input de texto estandarizado del Design System Agropecuario.
///
/// Soporta label, placeholder, íconos de prefijo/sufijo,
/// texto de error y modo password.
class CustomTextField extends StatelessWidget {
  const CustomTextField({
    super.key,
    required this.label,
    this.hint = '',
    this.controller,
    this.obscureText = false,
    this.enabled = true,
    this.readOnly = false,
    this.keyboardType,
    this.prefixIcon,
    this.suffixIcon,
    this.errorText,
    this.onChanged,
    this.onTap,
    this.maxLines = 1,
    this.autofocus = false,
  });

  /// Etiqueta que aparece arriba del campo.
  final String label;

  /// Texto placeholder dentro del campo.
  final String hint;

  /// Controller para leer/escribir valor.
  final TextEditingController? controller;

  /// Si es true, oculta el texto (para passwords).
  final bool obscureText;

  /// Si es false, el campo aparece deshabilitado.
  final bool enabled;

  /// Si es true, solo lectura (no editable).
  final bool readOnly;

  /// Tipo de teclado virtual.
  final TextInputType? keyboardType;

  /// Ícono al inicio del campo.
  final IconData? prefixIcon;

  /// Ícono al final del campo.
  final IconData? suffixIcon;

  /// Mensaje de error que aparece debajo del campo.
  final String? errorText;

  /// Callback al cambiar el texto.
  final ValueChanged<String>? onChanged;

  /// Callback al tocar el campo (útil para DatePicker, etc).
  final VoidCallback? onTap;

  /// Número de líneas (1 = campo normal, >1 = textarea).
  final int maxLines;

  /// Autofocus al montar.
  final bool autofocus;

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

        // ── TextField ───────────────────────────────────────────────────
        TextField(
          controller: controller,
          obscureText: obscureText,
          enabled: enabled,
          readOnly: readOnly,
          keyboardType: keyboardType,
          onChanged: onChanged,
          onTap: onTap,
          maxLines: maxLines,
          autofocus: autofocus,
          style: const TextStyle(
            fontSize: 15,
            color: AppColors.onSurface,
          ),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: prefixIcon != null
                ? Icon(prefixIcon, size: 20, color: AppColors.onSurfaceVariant)
                : null,
            suffixIcon: suffixIcon != null
                ? Icon(suffixIcon, size: 20, color: AppColors.onSurfaceVariant)
                : null,
            errorText: errorText,
          ),
        ),
      ],
    );
  }
}
