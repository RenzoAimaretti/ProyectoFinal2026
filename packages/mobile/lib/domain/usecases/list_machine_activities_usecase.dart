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
}
