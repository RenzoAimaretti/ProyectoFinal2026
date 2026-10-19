import '../repositories/machine_usage_repository.dart';
import '../repositories/task_reader.dart';
import '../models/machine_usage.dart';
import '../errors.dart';

/// CUU08: registra uso de maquinaria sobre una tarea (R021).
///
/// Todo el uso en campo corresponde a una tarea, así que la tarea es
/// obligatoria y debe existir localmente. Se exige al menos una medición
/// positiva (horas o hectáreas) y se conservan la fecha de trabajo y las notas.
class RegisterMachineUsageUseCase {
  RegisterMachineUsageUseCase(this._repository, this._taskReader);

  static const int maxObservationsLength = 1000;

  final MachineUsageRepository _repository;
  final TaskReader _taskReader;

  Future<void> execute(MachineUsage usage) async {
    final taskId = usage.taskId.trim();
    if (taskId.isEmpty) {
      throw const InvalidMachineUsageException(
        'Seleccioná la tarea a la que corresponde el uso.',
      );
    }
    if (usage.machineId.trim().isEmpty || usage.operatorId.trim().isEmpty) {
      throw const InvalidMachineUsageException(
        'El uso requiere máquina y operario.',
      );
    }

    final task = await _taskReader.getById(taskId);
    if (task == null) {
      throw const InvalidMachineUsageException(
        'La tarea seleccionada no está disponible.',
      );
    }

    final hours = usage.usageHours;
    final hectares = usage.hectares;
    if (hours != null && hours <= 0) {
      throw const InvalidMachineUsageException(
        'Las horas de uso deben ser mayores a 0.',
      );
    }
    if (hectares != null && hectares <= 0) {
      throw const InvalidMachineUsageException(
        'Las hectáreas deben ser mayores a 0.',
      );
    }
    if (hours == null && hectares == null) {
      throw const InvalidMachineUsageException(
        'Cargá las horas de uso o las hectáreas trabajadas.',
      );
    }

    final today = DateTime.now();
    final endOfToday = DateTime(today.year, today.month, today.day, 23, 59, 59);
    if (usage.workDate.isAfter(endOfToday)) {
      throw const InvalidMachineUsageException(
        'La fecha no puede ser futura.',
      );
    }

    final notes = usage.observations?.trim();
    if (notes != null && notes.length > maxObservationsLength) {
      throw const InvalidMachineUsageException(
        'Las observaciones no pueden superar los 1000 caracteres.',
      );
    }

    await _repository.create(
      MachineUsage(
        id: usage.id,
        machineId: usage.machineId,
        taskId: taskId,
        operatorId: usage.operatorId,
        usageHours: hours,
        hectares: hectares,
        workDate: usage.workDate,
        observations: notes?.isEmpty ?? true ? null : notes,
      ),
    );
  }
}
