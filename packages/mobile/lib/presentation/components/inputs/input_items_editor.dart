import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../buttons/secondary_button.dart';
import 'custom_dropdown.dart';
import 'custom_text_field.dart';

/// Opción de insumo (catálogo) para el editor de ítems.
class InputOption {
  const InputOption({required this.id, required this.label, required this.unit});

  final String id;
  final String label;

  /// Unidad por defecto del insumo (L | KG | UNIT).
  final String unit;
}

// ── Datos dummy (reemplazables por catálogos reales de drift) ──────────
const List<InputOption> _inputsDummy = [
  InputOption(id: 'inp-1', label: 'Glifosato', unit: 'L'),
  InputOption(id: 'inp-2', label: 'Urea', unit: 'KG'),
  InputOption(id: 'inp-3', label: 'Semilla', unit: 'UNIT'),
];

const List<String> _unitsDummy = ['L', 'KG', 'UNIT'];

/// Línea de consumo (insumo + cantidad + unidad) mantenida por el editor.
class _InputLine {
  String? inputId;
  String? unit;
  String quantity = '';
}

/// Editor de ítems de consumo del Design System Agropecuario.
///
/// Lista dinámica de líneas insumo + cantidad + unidad con botón
/// "Agregar insumo" y borrado por línea. Reusa [CustomDropdown] y
/// [CustomTextField]. La unidad se autocompleta al elegir el insumo.
class InputItemsEditor extends StatefulWidget {
  const InputItemsEditor({
    super.key,
    this.inputs = _inputsDummy,
    this.onChanged,
  });

  /// Opciones de insumo disponibles.
  final List<InputOption> inputs;

  /// Se dispara con la cantidad de líneas cada vez que cambia.
  final ValueChanged<int>? onChanged;

  @override
  State<InputItemsEditor> createState() => _InputItemsEditorState();
}

class _InputItemsEditorState extends State<InputItemsEditor> {
  final List<_InputLine> _lines = [];

  InputOption? _findInput(String? id) {
    for (final input in widget.inputs) {
      if (input.id == id) return input;
    }
    return null;
  }

  List<DropdownMenuItem<String>> _inputItems() {
    return widget.inputs
        .map(
          (o) => DropdownMenuItem<String>(value: o.id, child: Text(o.label)),
        )
        .toList();
  }

  List<DropdownMenuItem<String>> _unitItems() {
    return _unitsDummy
        .map((u) => DropdownMenuItem<String>(value: u, child: Text(u)))
        .toList();
  }

  void _addLine() {
    setState(() => _lines.add(_InputLine()));
    widget.onChanged?.call(_lines.length);
  }

  void _removeLine(int index) {
    setState(() => _lines.removeAt(index));
    widget.onChanged?.call(_lines.length);
  }

  Widget _buildLine(_InputLine line, int index) {
    return Container(
      key: ValueKey(line),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomDropdown<String>(
                  label: 'Insumo',
                  hint: 'Seleccionar insumo...',
                  items: _inputItems(),
                  value: line.inputId,
                  onChanged: (value) {
                    setState(() {
                      line.inputId = value;
                      final input = _findInput(value);
                      if (input != null) line.unit = input.unit;
                    });
                  },
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                onPressed: () => _removeLine(index),
                tooltip: 'Quitar insumo',
                icon: const Icon(
                  Icons.delete_outline,
                  color: AppColors.offline,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomTextField(
                  label: 'Cantidad',
                  hint: '0',
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (v) => line.quantity = v,
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 110,
                child: CustomDropdown<String>(
                  label: 'Unidad',
                  items: _unitItems(),
                  value: line.unit,
                  onChanged: (value) => setState(() => line.unit = value),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lineWidgets = <Widget>[];
    for (var i = 0; i < _lines.length; i++) {
      lineWidgets.add(_buildLine(_lines[i], i));
      lineWidgets.add(const SizedBox(height: 12));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_lines.isEmpty)
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text(
              'Sin insumos cargados',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ...lineWidgets,
        SecondaryButton(
          label: 'Agregar insumo',
          icon: Icons.add,
          onPressed: _addLine,
          isFullWidth: true,
        ),
      ],
    );
  }
}
