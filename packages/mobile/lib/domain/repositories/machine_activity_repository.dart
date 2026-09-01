import 'dart:async';

import '../models/machine_activity.dart';

/// Persistencia de actividades de maquinaria (CUU08).
abstract class MachineActivityRepository {
  Future<void> create(MachineActivity activity);

  Stream<List<MachineActivity>> watchByMachine(
    String machineId, {
    DateTime? from,
    DateTime? to,
  });
}
