import 'package:flutter/foundation.dart';

import '../../domain/models/catalogs.dart';
import '../../domain/models/machine_usage.dart';
import '../../domain/models/task.dart';
import '../../domain/repositories/machine_reader.dart';
import '../../domain/repositories/task_reader.dart';
import '../../domain/usecases/register_machine_usage_usecase.dart';

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
    required String operatorId,
    String? companyId,
  })  : _registerUseCase = registerUseCase,
        _taskReader = taskReader,
        _machineReader = machineReader,
        _operatorId = operatorId,
        _companyId = companyId;

  final RegisterMachineUsageUseCase _registerUseCase;
  final TaskReader _taskReader;
  final MachineReader _machineReader;
  String _operatorId;
  String? _companyId;

  String get operatorId => _operatorId;

  /// La sesión se restaura de forma asíncrona: el operario se actualiza al
  /// resolverla para no registrar uso a nombre de otro usuario.
  void setOperator(String operatorId) {
    if (_operatorId == operatorId) return;
    _operatorId = operatorId;
    notifyListeners();
  }

  /// Tareas asignadas al operario de la sesión: todo uso corresponde a una.
  Stream<List<Task>> get assignedTasks =>
      _taskReader.watchAssignedTo(_operatorId);

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
