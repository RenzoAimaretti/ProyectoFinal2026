import 'dart:async';

import '../models/machine_activity.dart';
import '../repositories/machine_activity_repository.dart';

/// CUU08: historial de actividades por máquina (stream).
class ListMachineActivitiesUseCase {
  ListMachineActivitiesUseCase(this._repository);

  final MachineActivityRepository _repository;

  Stream<List<MachineActivity>> execute(
    String machineId, {
    DateTime? from,
    DateTime? to,
  }) {
    return _repository.watchByMachine(machineId, from: from, to: to);
  }

  /// Historial global (todas las máquinas) para el listado del demo.
  Stream<List<MachineActivity>> watchAll() => _repository.watchAll();

  /// CUU08 (multi-firma): actividades de la firma activa; `null` = todas.
  Stream<List<MachineActivity>> watchByCompany(String? companyId) {
    if (companyId == null) {
      return _repository.watchAll();
    }
    return _repository.watchByCompany(companyId);
  }
}
