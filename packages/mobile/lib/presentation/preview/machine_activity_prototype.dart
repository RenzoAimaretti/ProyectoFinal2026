import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../domain/models/enums.dart';
import '../components/buttons/primary_button.dart';
import '../components/inputs/custom_dropdown.dart';
import '../components/inputs/custom_text_field.dart';
import '../components/inputs/date_field.dart';
import '../components/selectors/activity_type_selector.dart';

/// Máquinas dummy del selector (visual only — reemplazables por el
/// catálogo real de drift).
const List<DropdownMenuItem<String>> _maquinasDummy = [
  DropdownMenuItem(value: 'maq-1', child: Text('Tractor John Deere 6400')),
  DropdownMenuItem(value: 'maq-2', child: Text('Pulverizadora Metalfor')),
  DropdownMenuItem(value: 'maq-3', child: Text('Camión cisterna 14.000L')),
];

/// Firmas/razones sociales dummy para discriminar el costo de combustible
/// (R019).
const List<DropdownMenuItem<String>> _firmasDummy = [
  DropdownMenuItem(value: 'eliggi', child: Text('Eliggi')),
  DropdownMenuItem(value: 'eliggi_tufoni', child: Text('Eliggi Tufoni')),
  DropdownMenuItem(value: 'eliggi_nestor', child: Text('Eliggi Néstor')),
];

/// Prototipo del formulario CUU08 "Actividades de Maquinaria".
///
/// Formulario dinámico según el tipo de actividad seleccionado:
/// - Combustible: litros + comprobante + firma (obligatoria, R019).
/// - Mantenimiento / Reparación: costo + descripción del trabajo.
/// - Uso en campo: horas de uso + hectáreas.
///
/// Visual only: datos dummy, validación por tipo y sin persistencia real.
class MachineActivityPrototype extends StatefulWidget {
  const MachineActivityPrototype({super.key});

  @override
  State<MachineActivityPrototype> createState() =>
      _MachineActivityPrototypeState();
}

class _MachineActivityPrototypeState extends State<MachineActivityPrototype> {
  String? _maquinaId;

  MachineActivityType? _tipo;

  String? _firmaId;

  // Controllers por campo (persisten el texto al alternar entre tipos).
  final _fechaController = TextEditingController();
  final _litrosController = TextEditingController();
  final _comprobanteController = TextEditingController();
  final _costoController = TextEditingController();
  final _descripcionController = TextEditingController();
  final _horasController = TextEditingController();
  final _hectareasController = TextEditingController();
  final _observacionesController = TextEditingController();

  @override
  void dispose() {
    _fechaController.dispose();
    _litrosController.dispose();
    _comprobanteController.dispose();
    _costoController.dispose();
    _descripcionController.dispose();
    _horasController.dispose();
    _hectareasController.dispose();
    _observacionesController.dispose();
    super.dispose();
  }

  /// Espejo de las reglas de dominio (R018/R019/R020/R021): los campos
  /// numéricos del tipo elegido deben ser > 0, la fecha es obligatoria en
  /// todos los tipos, el combustible exige firma y mantenimiento/reparación
  /// exigen descripción. Devuelve el mensaje de error, o null si es válido.
  String? _validar() {
    if (_tipo == null) {
      return 'Seleccioná un tipo de actividad.';
    }
    if (!isValidDate(_fechaController.text)) {
      return fechaInvalidaMensaje;
    }
    switch (_tipo!) {
      case MachineActivityType.FUEL:
        final litros = double.tryParse(_litrosController.text);
        if (litros == null || litros <= 0) {
          return 'Los litros de combustible deben ser mayores a 0.';
        }
        if (_firmaId == null) {
          return 'Seleccioná la firma para discriminar el costo.';
        }
        break;
      case MachineActivityType.MAINTENANCE:
      case MachineActivityType.REPAIR:
        final costo = double.tryParse(_costoController.text);
        if (costo == null || costo <= 0) {
          return 'El costo debe ser mayor a 0.';
        }
        if (_descripcionController.text.trim().isEmpty) {
          return 'Ingresá la descripción del trabajo.';
        }
        break;
      case MachineActivityType.FIELD_USAGE:
        final horas = double.tryParse(_horasController.text);
        if (horas == null || horas <= 0) {
          return 'Las horas de uso deben ser mayores a 0.';
        }
        final hectareas = double.tryParse(_hectareasController.text);
        if (hectareas == null || hectareas <= 0) {
          return 'Las hectáreas deben ser mayores a 0.';
        }
        break;
    }
    return null;
  }

  void _guardar() {
    final error = _validar();
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Actividad guardada (prototipo)')),
    );
  }

  /// Construye la sección dinámica según el tipo seleccionado.
  List<Widget> _dynamicFields() {
    switch (_tipo) {
      case MachineActivityType.FUEL:
        return [
          CustomTextField(
            label: 'Litros',
            hint: '0',
            controller: _litrosController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            prefixIcon: Icons.local_gas_station,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Comprobante',
            hint: 'Nº de comprobante / ticket...',
            controller: _comprobanteController,
            prefixIcon: Icons.receipt_long,
          ),
          const SizedBox(height: 16),
          CustomDropdown<String>(
            label: 'Firma',
            hint: 'Seleccionar firma...',
            items: _firmasDummy,
            value: _firmaId,
            prefixIcon: Icons.business,
            onChanged: (v) => setState(() => _firmaId = v),
          ),
        ];
      case MachineActivityType.MAINTENANCE:
      case MachineActivityType.REPAIR:
        return [
          CustomTextField(
            label: 'Costo',
            hint: '0.00',
            controller: _costoController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            prefixIcon: Icons.attach_money,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Descripción del trabajo',
            hint: 'Descripción del trabajo realizado...',
            controller: _descripcionController,
            maxLines: 3,
            prefixIcon: Icons.settings_suggest,
          ),
        ];
      case MachineActivityType.FIELD_USAGE:
        return [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomTextField(
                  label: 'Horas de uso',
                  hint: '0',
                  controller: _horasController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  prefixIcon: Icons.timer_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomTextField(
                  label: 'Hectáreas',
                  hint: '0.0',
                  controller: _hectareasController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  prefixIcon: Icons.landscape,
                ),
              ),
            ],
          ),
        ];
      case null:
        return const [
          Text(
            'Seleccioná un tipo de actividad para ver los campos.',
            style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
          ),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Actividad de Maquinaria')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Máquina',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Registrá una actividad sobre la máquina seleccionada.',
              style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            CustomDropdown<String>(
              label: 'Máquina',
              hint: 'Seleccionar máquina...',
              items: _maquinasDummy,
              value: _maquinaId,
              prefixIcon: Icons.agriculture,
              onChanged: (v) => setState(() => _maquinaId = v),
            ),
            const SizedBox(height: 16),
            DateField(controller: _fechaController),
            const SizedBox(height: 24),

            // ── Tipo de actividad + campos dinámicos ────────────────────
            ActivityTypeSelector(
              selected: _tipo,
              onChanged: (tipo) => setState(() => _tipo = tipo),
            ),
            const SizedBox(height: 20),
            ..._dynamicFields(),
            const SizedBox(height: 24),

            // ── Observaciones ───────────────────────────────────────────
            CustomTextField(
              label: 'Observaciones',
              hint: 'Detalles adicionales de la actividad...',
              controller: _observacionesController,
              maxLines: 3,
              prefixIcon: Icons.notes,
            ),
            const SizedBox(height: 32),
            PrimaryButton(
              label: 'Guardar actividad',
              icon: Icons.save,
              isFullWidth: true,
              onPressed: _guardar,
            ),
          ],
        ),
      ),
    );
  }
}
