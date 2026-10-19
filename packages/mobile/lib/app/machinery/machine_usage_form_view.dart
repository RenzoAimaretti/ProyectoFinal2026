import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/machine_usage.dart';
import '../../domain/models/task.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/inputs/custom_dropdown.dart';
import '../../presentation/components/inputs/custom_text_field.dart';
import '../../presentation/components/inputs/date_field.dart';
import 'machine_usage_form_view_model.dart';

/// Formulario de uso de maquinaria ligado a una tarea (CUU08, R021).
///
/// Todo el uso en campo corresponde a una tarea: se elige la tarea asignada, la
/// máquina, las horas y/o hectáreas, la fecha real del trabajo y notas
/// opcionales. El guardado local encola el push idempotente (T12).
class MachineUsageFormView extends StatefulWidget {
  const MachineUsageFormView({super.key, required this.viewModel});

  final MachineUsageFormViewModel viewModel;

  @override
  State<MachineUsageFormView> createState() => _MachineUsageFormViewState();
}

class _MachineUsageFormViewState extends State<MachineUsageFormView> {
  String? _taskId;
  String? _machineId;
  final _fechaController = TextEditingController();
  final _horasController = TextEditingController();
  final _hectareasController = TextEditingController();
  final _observacionesController = TextEditingController();

  @override
  void dispose() {
    _fechaController.dispose();
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

  String? _validar() {
    if (_taskId == null) {
      return 'Seleccioná la tarea a la que corresponde el uso.';
    }
    if (_machineId == null) {
      return 'Seleccioná la máquina.';
    }
    if (!isValidDate(_fechaController.text)) {
      return fechaInvalidaMensaje;
    }
    final horas = double.tryParse(_horasController.text.trim());
    final hectareas = double.tryParse(_hectareasController.text.trim());
    if (horas == null && hectareas == null) {
      return 'Cargá las horas de uso o las hectáreas trabajadas.';
    }
    if (horas != null && horas <= 0) {
      return 'Las horas de uso deben ser mayores a 0.';
    }
    if (hectareas != null && hectareas <= 0) {
      return 'Las hectáreas deben ser mayores a 0.';
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
      await widget.viewModel.register(
        MachineUsage(
          taskId: _taskId!,
          machineId: _machineId!,
          operatorId: widget.viewModel.operatorId,
          usageHours: double.tryParse(_horasController.text.trim()),
          hectares: double.tryParse(_hectareasController.text.trim()),
          workDate: _parseDate(_fechaController.text),
          observations: _orNull(_observacionesController.text),
        ),
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      _showMessage(e.toString().replaceAll('Exception: ', ''));
    }
  }

  static String? _orNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static DateTime _parseDate(String value) {
    final match = RegExp(r'^(\d{2})/(\d{2})/(\d{4})$').firstMatch(value.trim())!;
    return DateTime(
      int.parse(match.group(3)!),
      int.parse(match.group(2)!),
      int.parse(match.group(1)!),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: AppColors.surface,
          appBar: AppBar(title: const Text('Uso de Maquinaria')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Uso por tarea',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Todo el uso en campo se registra sobre la tarea donde se trabajó.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                _taskDropdown(),
                const SizedBox(height: 16),
                _machineDropdown(),
                const SizedBox(height: 16),
                DateField(controller: _fechaController),
                const SizedBox(height: 16),
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
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'Observaciones',
                  hint: 'Detalles del trabajo...',
                  controller: _observacionesController,
                  maxLines: 3,
                  prefixIcon: Icons.notes,
                ),
                const SizedBox(height: 32),
                PrimaryButton(
                  label: 'Guardar uso',
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

  Widget _taskDropdown() {
    return StreamBuilder<List<Task>>(
      stream: widget.viewModel.assignedTasks,
      builder: (context, snapshot) {
        final tasks = snapshot.data ?? const <Task>[];
        return CustomDropdown<String>(
          label: 'Tarea',
          hint: tasks.isEmpty
              ? 'No tenés tareas asignadas'
              : 'Seleccionar tarea...',
          items: tasks
              .map(
                (task) => DropdownMenuItem<String>(
                  value: task.id,
                  child: Text(_taskLabel(task)),
                ),
              )
              .toList(),
          value: _taskId,
          prefixIcon: Icons.assignment_outlined,
          onChanged: (value) => setState(() => _taskId = value),
        );
      },
    );
  }

  /// Etiqueta legible de la tarea. Los nombres de lote/labor llegan con el
  /// pull de catálogo real; mientras tanto se muestra un identificador corto.
  static String _taskLabel(Task task) {
    final id = task.id ?? '';
    final short = id.length > 8 ? id.substring(0, 8) : id;
    return 'Tarea $short';
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
                (machine) => DropdownMenuItem<String>(
                  value: machine.id,
                  child: Text(machine.name),
                ),
              )
              .toList(),
          value: _machineId,
          prefixIcon: Icons.agriculture,
          onChanged: (value) => setState(() => _machineId = value),
        );
      },
    );
  }
}
