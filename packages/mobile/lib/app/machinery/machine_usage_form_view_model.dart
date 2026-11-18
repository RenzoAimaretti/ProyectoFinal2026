import 'package:flutter/foundation.dart';

import '../../domain/models/catalogs.dart';
import '../../domain/models/machine_usage.dart';
import '../../domain/models/task.dart';
import '../../domain/repositories/machine_reader.dart';
import '../../domain/repositories/lot_reader.dart';
import '../../domain/repositories/labor_type_reader.dart';
import '../../domain/repositories/task_reader.dart';
import '../../domain/usecases/register_machine_usage_usecase.dart';

/// Opción de tarea lista para presentar, sin referencias a la base local.
class MachineUsageTaskOption {
  const MachineUsageTaskOption({required this.task, required this.label});

  final Task task;
  final String label;
}

/// ViewModel del alta de uso de maquinaria por tarea (CUU08, R021).
///
/// Expone las tareas asignadas al operario de la sesión y las máquinas de la
/// firma activa. El guardado delega en [RegisterMachineUsageUseCase], que exige
/// tarea válida, al menos una medición positiva, fecha no futura y notas
/// acotadas.
class MachineUsageFormViewModel extends ChangeNotifier {
  MachineUsageFormViewModel({
    required RegisterMachineUsageUseCase registerUseCase,
    required TaskReader taskReader,
    required MachineReader machineReader,
    LotReader? lotReader,
    LaborTypeReader? laborTypeReader,
    required String operatorId,
    String? companyId,
  })  : _registerUseCase = registerUseCase,
        _taskReader = taskReader,
        _machineReader = machineReader,
        _lotReader = lotReader,
        _laborTypeReader = laborTypeReader,
        _operatorId = operatorId,
        _companyId = companyId;

  final RegisterMachineUsageUseCase _registerUseCase;
  final TaskReader _taskReader;
  final MachineReader _machineReader;
  final LotReader? _lotReader;
  final LaborTypeReader? _laborTypeReader;
  String _operatorId;
  String? _companyId;
  Stream<List<MachineUsageTaskOption>>? _taskOptions;

  String get operatorId => _operatorId;

  /// La sesión se restaura de forma asíncrona: el operario se actualiza al
  /// resolverla para no registrar uso a nombre de otro usuario.
  void setOperator(String operatorId) {
    if (_operatorId == operatorId) return;
    _operatorId = operatorId;
    _taskOptions = null;
    notifyListeners();
  }

  /// Tareas asignadas al operario de la sesión: todo uso corresponde a una.
  Stream<List<Task>> get assignedTasks =>
      _taskReader.watchAssignedTo(_operatorId);

  /// Resuelve los nombres desde el catálogo local sin exponer Drift a la vista.
  /// Lectores opcionales mantienen el fallback para catálogos aún no conectados.
  Stream<List<MachineUsageTaskOption>> get taskOptions =>
      _taskOptions ??= assignedTasks.asyncMap(
        (tasks) => Future.wait(tasks.map((task) async {
          final id = task.id ?? '';
          final short = id.length > 8 ? id.substring(0, 8) : id;
          var label = 'Tarea $short';
          if (_lotReader != null && _laborTypeReader != null) {
            final lot = await _lotReader.getById(task.lotId);
            final labor = await _laborTypeReader.getById(task.laborTypeId);
            if (lot != null && labor != null && !lot.deleted && !labor.deleted &&
                lot.name.trim().isNotEmpty && labor.name.trim().isNotEmpty) {
              label = '${labor.name.trim()} · ${lot.name.trim()}';
            }
          }
          return MachineUsageTaskOption(task: task, label: label);
        })),
      );

  /// Máquinas de la firma activa; sin firma seleccionada, todas.
  Stream<List<Machine>> get machines {
    final companyId = _companyId;
    return companyId == null || companyId.isEmpty
        ? _machineReader.watchAll()
        : _machineReader.watchByCompany(companyId);
  }

  /// Cambia la firma activa (selector global) y refresca las máquinas.
  void setCompany(String? companyId) {
    if (_companyId == companyId) return;
    _companyId = companyId;
    notifyListeners();
  }

  bool _isSaving = false;
  bool get isSaving => _isSaving;

  Future<void> register(MachineUsage usage) async {
    _isSaving = true;
    notifyListeners();
    try {
      await _registerUseCase.execute(usage);
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }
}
