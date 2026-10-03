import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'custom_text_field.dart';

/// Formatea la entrada del usuario con máscara `DD/MM/AAAA`.
///
/// El usuario tipea solo dígitos y los separadores `/` se insertan solos.
/// Acepta hasta 8 dígitos (`DDMMAAAA`) y elimina cualquier caracter no
/// numérico que se pegue o ingrese.
class DateMaskFormatter extends TextInputFormatter {
  const DateMaskFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 8) {
      digits = digits.substring(0, 8);
    }

    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      buffer.write(digits[i]);
      if (i == 1 || i == 3) {
        buffer.write('/');
      }
    }

    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Mensaje de error estándar para fechas inválidas.
const String fechaInvalidaMensaje = 'Ingresá una fecha válida (DD/MM/AAAA).';

/// Verifica que [value] tenga el formato `DD/MM/AAAA` con día 1-31 y mes 1-12.
///
/// Además valida la cantidad de días según el mes (incluye años bisiestos),
/// por lo que rechaza fechas como `31/02/AAAA` o `30/02/AAAA`.
bool isValidDate(String value) {
  final match = RegExp(r'^(\d{2})/(\d{2})/(\d{4})$').firstMatch(value.trim());
  if (match == null) {
    return false;
  }

  final day = int.parse(match.group(1)!);
  final month = int.parse(match.group(2)!);
  final year = int.parse(match.group(3)!);

  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1) {
    return false;
  }

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  final maxDay = (month == 2 && _isLeapYear(year)) ? 29 : daysInMonth[month - 1];
  return day <= maxDay;
}

/// Devuelve el mensaje de error si [value] no es una fecha válida, o null.
String? dateValidationMessage(String value) =>
    isValidDate(value) ? null : fechaInvalidaMensaje;

bool _isLeapYear(int year) =>
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

/// Campo de fecha reutilizable con máscara `DD/MM/AAAA`.
///
/// Envuelve [CustomTextField] para mantener el estilo del Design System.
/// El teclado es numérico y la máscara inserta los `/` automáticamente.
class DateField extends StatelessWidget {
  const DateField({
    super.key,
    this.label = 'Fecha',
    this.hint = 'DD/MM/AAAA',
    this.controller,
    this.errorText,
    this.onChanged,
    this.prefixIcon = Icons.calendar_today_outlined,
    this.enabled = true,
    this.readOnly = false,
  });

  /// Etiqueta que aparece arriba del campo.
  final String label;

  /// Texto placeholder dentro del campo.
  final String hint;

  /// Controller para leer/escribir el valor con máscara.
  final TextEditingController? controller;

  /// Mensaje de error que aparece debajo del campo.
  final String? errorText;

  /// Callback al cambiar el texto.
  final ValueChanged<String>? onChanged;

  /// Ícono al inicio del campo.
  final IconData? prefixIcon;

  /// Si es false, el campo aparece deshabilitado.
  final bool enabled;

  /// Si es true, solo lectura (no editable).
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    return CustomTextField(
      label: label,
      hint: hint,
      controller: controller,
      errorText: errorText,
      onChanged: onChanged,
      prefixIcon: prefixIcon,
      enabled: enabled,
      readOnly: readOnly,
      keyboardType: TextInputType.number,
      inputFormatters: [
        const DateMaskFormatter(),
        LengthLimitingTextInputFormatter(10),
      ],
    );
  }
}
