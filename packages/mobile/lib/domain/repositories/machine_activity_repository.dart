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

  /// Actividades de una firma/razón social específica (multi-firma).
  Stream<List<MachineActivity>> watchByCompany(String companyId);

  /// Historial global (todas las máquinas), para el listado del demo.
  Stream<List<MachineActivity>> watchAll();
}
