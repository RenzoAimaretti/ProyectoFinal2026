import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/machine_activity.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/inputs/custom_dropdown.dart';
import '../../presentation/components/inputs/custom_text_field.dart';
import '../../presentation/components/inputs/date_field.dart';
import '../../presentation/components/selectors/activity_type_selector.dart';
import 'machine_activity_form_view_model.dart';

/// Formulario de alta de actividad de maquinaria (CUU08).
///
/// Formulario dinámico según el tipo de actividad seleccionado:
/// - Combustible: litros + comprobante + firma (obligatoria, R019).
/// - Mantenimiento / Reparación: costo + descripción del trabajo.
/// - Uso en campo: horas de uso + hectáreas.
///
/// Valida en el form (espejo del `RegisterMachineActivityUseCase`), delega la
/// persistencia al ViewModel y al guardar vuelve a la lista (que se refresca
/// vía stream).
class MachineActivityFormView extends StatefulWidget {
  const MachineActivityFormView({super.key, required this.viewModel});

  final MachineActivityFormViewModel viewModel;

  @override
  State<MachineActivityFormView> createState() =>
      _MachineActivityFormViewState();
}

class _MachineActivityFormViewState extends State<MachineActivityFormView> {
  String? _machineId;
  MachineActivityType? _type;

  /// Firma/razón social que asume el costo de combustible (R019).
  String? _companyId;

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

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  /// Espejo de las reglas de dominio (R018–R021): valida máquina, tipo, fecha
  /// y los campos numéricos del tipo elegido. Devuelve el mensaje de error, o
  /// null si es válido.
  String? _validar() {
    if (_machineId == null) {
      return 'Seleccioná la máquina.';
    }
    if (_type == null) {
      return 'Seleccioná un tipo de actividad.';
    }
    if (!isValidDate(_fechaController.text)) {
      return fechaInvalidaMensaje;
    }
    switch (_type!) {
      case MachineActivityType.FUEL:
        final litros = double.tryParse(_litrosController.text);
        if (litros == null || litros <= 0) {
          return 'Los litros de combustible deben ser mayores a 0.';
        }
        if (_companyId == null) {
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

  Future<void> _save() async {
    final error = _validar();
    if (error != null) {
      _showMessage(error);
      return;
    }

    try {
      await widget.viewModel.register(_buildActivity());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      final message = e.toString().replaceAll('Exception: ', '');
      _showMessage(message);
    }
  }

  /// Construye la [MachineActivity] desde el estado del form. Los campos
  /// vacíos se mapean a null; la fecha se parsea a `DateTime` (ya validada).
  MachineActivity _buildActivity() {
    return MachineActivity(
      machineId: _machineId!,
      type: _type!,
      date: _parseDate(_fechaController.text),
      liters: _parseDouble(_litrosController.text),
      receipt: _orNull(_comprobanteController.text),
      cost: _parseDouble(_costoController.text),
      spareParts: _orNull(_descripcionController.text),
      usageHours: _parseDouble(_horasController.text),
      hectares: _parseDouble(_hectareasController.text),
      companyId: _companyId,
      observations: _orNull(_observacionesController.text),
    );
  }

  static double? _parseDouble(String value) => double.tryParse(value.trim());

  static String? _orNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static DateTime _parseDate(String value) {
    final match =
        RegExp(r'^(\d{2})/(\d{2})/(\d{4})$').firstMatch(value.trim())!;
    final day = int.parse(match.group(1)!);
    final month = int.parse(match.group(2)!);
    final year = int.parse(match.group(3)!);
    return DateTime(year, month, day);
  }

  /// Construye la sección dinámica según el tipo seleccionado.
  List<Widget> _dynamicFields() {
    switch (_type) {
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
          _firmaDropdown(),
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

  Widget _machineDropdown() {
    return StreamBuilder<List<Machine>>(
      stream: widget.viewModel.machines,
      builder: (context, snapshot) {
        final machines = snapshot.data ?? const <Machine>[];
        return CustomDropdown<String>(
          label: 'Máquina',
          hint: 'Seleccionar máquina...',
          items: machines
              .map(
                (m) => DropdownMenuItem<String>(
                  value: m.id,
                  child: Text(m.name),
                ),
              )
              .toList(),
          value: _machineId,
          prefixIcon: Icons.agriculture,
          onChanged: (v) => setState(() => _machineId = v),
        );
      },
    );
  }

  Widget _firmaDropdown() {
    return StreamBuilder<List<Company>>(
      stream: widget.viewModel.companies,
      builder: (context, snapshot) {
        final companies = snapshot.data ?? const <Company>[];
        return CustomDropdown<String>(
          label: 'Firma',
          hint: 'Seleccionar firma...',
          items: companies
              .map(
                (c) => DropdownMenuItem<String>(
                  value: c.id,
                  child: Text(c.name),
                ),
              )
              .toList(),
          value: _companyId,
          prefixIcon: Icons.business,
          onChanged: (v) => setState(() => _companyId = v),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: AppColors.surface,
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
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                _machineDropdown(),
                const SizedBox(height: 16),
                DateField(controller: _fechaController),
                const SizedBox(height: 24),

                // ── Tipo de actividad + campos dinámicos ────────────────
                ActivityTypeSelector(
                  selected: _type,
                  onChanged: (tipo) => setState(() => _type = tipo),
                ),
                const SizedBox(height: 20),
                ..._dynamicFields(),
                const SizedBox(height: 24),

                // ── Observaciones ───────────────────────────────────────
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
                  isLoading: widget.viewModel.isSaving,
                  onPressed: _save,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
