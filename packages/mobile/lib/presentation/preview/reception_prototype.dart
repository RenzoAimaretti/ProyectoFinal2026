import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../components/buttons/primary_button.dart';
import '../components/inputs/custom_dropdown.dart';
import '../components/inputs/input_items_editor.dart';
import '../components/photos/photo_picker_grid.dart';

/// Clientes dummy del selector (visual only — reemplazables por el
/// catálogo real de drift).
const List<DropdownMenuItem<String>> _clientesDummy = [
  DropdownMenuItem(value: 'cli-1', child: Text('Eliggi')),
  DropdownMenuItem(value: 'cli-2', child: Text('Agro Norte')),
];

/// Prototipo del formulario CUU06 "Recepción de Insumos".
///
/// Cliente + ítems de insumo (insumo + cantidad + unidad) + galería de
/// fotos. Visual only: datos dummy, validación de cantidades > 0 y sin
/// persistencia real.
class ReceptionPrototype extends StatefulWidget {
  const ReceptionPrototype({super.key});

  @override
  State<ReceptionPrototype> createState() => _ReceptionPrototypeState();
}

class _ReceptionPrototypeState extends State<ReceptionPrototype> {
  String? _clienteId;
  List<String> _cantidades = const [];

  /// Espejo de las reglas de dominio: cada ítem debe tener cantidad > 0.
  bool _validar() {
    for (final q in _cantidades) {
      final v = double.tryParse(q);
      if (v == null || v <= 0) return false;
    }
    return true;
  }

  void _guardar() {
    if (!_validar()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Las cantidades de los insumos deben ser mayores a 0.'),
        ),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Recepción guardada (prototipo)')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recepción de Insumos')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Cliente',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Seleccioná el cliente que entrega los insumos.',
              style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            CustomDropdown<String>(
              label: 'Cliente',
              hint: 'Seleccionar cliente...',
              items: _clientesDummy,
              value: _clienteId,
              onChanged: (v) => setState(() => _clienteId = v),
            ),
            const SizedBox(height: 24),
            const Text(
              'Insumos recibidos',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            InputItemsEditor(
              onQuantitiesChanged: (list) => setState(() => _cantidades = list),
            ),
            const SizedBox(height: 24),
            PhotoPickerGrid(),
            const SizedBox(height: 32),
            PrimaryButton(
              label: 'Guardar recepción',
              icon: Icons.check,
              isFullWidth: true,
              onPressed: _guardar,
            ),
          ],
        ),
      ),
    );
  }
}
