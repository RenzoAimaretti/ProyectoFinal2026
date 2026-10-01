import 'dart:async';

import '../models/machine_activity.dart';
import '../models/machine_activity_summary.dart';

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

  /// Actividades con `machineName` resuelto para listados (D2).
  /// `companyId == null` devuelve todas las firmas.
  Stream<List<MachineActivitySummary>> watchSummaries({String? companyId});
}
