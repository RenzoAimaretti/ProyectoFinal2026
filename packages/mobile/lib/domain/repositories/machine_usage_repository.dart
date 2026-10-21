import 'dart:async';

import '../models/machine_usage.dart';

/// Persistencia de usos de maquinaria ligados a tarea (CUU08, R021).
abstract class MachineUsageRepository {
  Future<void> create(MachineUsage usage);

  Stream<List<MachineUsage>> watchByTask(String taskId);

  Stream<List<MachineUsage>> watchByMachine(String machineId);

  Stream<List<MachineUsage>> watchAll();
}
