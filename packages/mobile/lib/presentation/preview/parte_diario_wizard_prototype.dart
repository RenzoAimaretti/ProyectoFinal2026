import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../components/buttons/primary_button.dart';
import '../components/buttons/secondary_button.dart';
import '../components/inputs/custom_text_field.dart';
import '../components/inputs/input_items_editor.dart';
import '../components/photos/photo_picker_grid.dart';
import '../components/selectors/cascade_selector.dart';
import '../components/steppers/wizard_stepper.dart';

/// Etiquetas dummy de los lotes (visual only — espejo de los ids
/// internos del [CascadeSelector] para armar el resumen del paso 3).
const Map<String, String> _loteLabels = {
  'lot-1': 'Lote 1',
  'lot-2': 'Lote 2',
  'lot-3': 'Lote A',
  'lot-4': 'Lote N1',
  'lot-5': 'Lote N2',
};

/// Prototipo del formulario CUU05 "Parte Diario" como wizard de 3 pasos.
///
/// Paso 1: selección en cascada (Cliente → Campo → Lote → Labor).
/// Paso 2: hectáreas + horas (numéricos) e ítems de consumo.
/// Paso 3: galería de fotos + tarjeta resumen.
///
/// Visual only: datos dummy, sin binding ni persistencia real.
class ParteDiarioWizardPrototype extends StatefulWidget {
  const ParteDiarioWizardPrototype({super.key});

  @override
  State<ParteDiarioWizardPrototype> createState() =>
      _ParteDiarioWizardPrototypeState();
}

class _ParteDiarioWizardPrototypeState
    extends State<ParteDiarioWizardPrototype> {
  static const List<String> _stepLabels = [
    'Selección',
    'Datos e insumos',
    'Fotos y resumen',
  ];

  int _currentStep = 0;

  // Estado capturado de los pasos para alimentar el resumen (paso 3).
  String? _loteId;
  String _hectareas = '';
  int _itemsCount = 0;

  void _next() {
    if (_currentStep < _stepLabels.length - 1) {
      setState(() => _currentStep++);
      return;
    }
    // Último paso → "Guardar" (visual, sin persistencia).
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Parte diario guardado (prototipo)')),
    );
  }

  void _back() {
    if (_currentStep > 0) setState(() => _currentStep--);
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentStep == _stepLabels.length - 1;

    return Scaffold(
      appBar: AppBar(title: const Text('Parte Diario')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: WizardStepper(
              currentStep: _currentStep,
              steps: _stepLabels,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            // IndexedStack preserva el estado de cada paso al navegar atrás.
            child: IndexedStack(
              index: _currentStep,
              children: [
                _SeleccionStep(
                  onLoteChanged: (id) => setState(() => _loteId = id),
                ),
                _DatosInsumosStep(
                  onHectareasChanged: (v) => setState(() => _hectareas = v),
                  onItemsChanged: (n) => setState(() => _itemsCount = n),
                ),
                _ResumenStep(
                  loteId: _loteId,
                  hectareas: _hectareas,
                  itemsCount: _itemsCount,
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Row(
          children: [
            if (_currentStep > 0) ...[
              Expanded(
                child: SecondaryButton(
                  label: 'Atrás',
                  icon: Icons.arrow_back,
                  isFullWidth: true,
                  onPressed: _back,
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: PrimaryButton(
                label: isLast ? 'Guardar' : 'Siguiente',
                icon: isLast ? Icons.check : Icons.arrow_forward,
                isFullWidth: true,
                onPressed: _next,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Paso 1: Selección en cascada ───────────────────────────────────────────

class _SeleccionStep extends StatelessWidget {
  const _SeleccionStep({this.onLoteChanged});

  final ValueChanged<String?>? onLoteChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ubicación y labor',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Seleccioná cliente, campo, lote y labor para el parte.',
            style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          CascadeSelector(onLoteChanged: onLoteChanged),
        ],
      ),
    );
  }
}

// ── Paso 2: Datos e insumos ────────────────────────────────────────────────

class _DatosInsumosStep extends StatelessWidget {
  const _DatosInsumosStep({
    this.onHectareasChanged,
    this.onItemsChanged,
  });

  final ValueChanged<String>? onHectareasChanged;
  final ValueChanged<int>? onItemsChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Jornada',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomTextField(
                  label: 'Hectáreas',
                  hint: '0.0',
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  onChanged: onHectareasChanged,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomTextField(
                  label: 'Horas',
                  hint: '0',
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Insumos consumidos',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          InputItemsEditor(onChanged: onItemsChanged),
        ],
      ),
    );
  }
}

// ── Paso 3: Fotos + resumen ────────────────────────────────────────────────

class _ResumenStep extends StatelessWidget {
  const _ResumenStep({
    this.loteId,
    required this.hectareas,
    required this.itemsCount,
  });

  final String? loteId;
  final String hectareas;
  final int itemsCount;

  String get _loteLabel {
    if (loteId == null) return 'Sin seleccionar';
    return _loteLabels[loteId] ?? loteId!;
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PhotoPickerGrid(),
          const SizedBox(height: 24),
          const Text(
            'Resumen',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.outlineVariant),
            ),
            child: Column(
              children: [
                _SummaryRow(label: 'Lote', value: _loteLabel),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Hectáreas',
                  value: hectareas.isEmpty ? '—' : '$hectareas ha',
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Ítems de consumo',
                  value: '$itemsCount',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Fila label/valor de la tarjeta resumen.
class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
      ],
    );
  }
}
