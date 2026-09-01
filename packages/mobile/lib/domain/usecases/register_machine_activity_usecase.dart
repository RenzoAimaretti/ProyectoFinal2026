import 'dart:async';

import '../errors.dart';
import '../models/enums.dart';
import '../models/machine_activity.dart';
import '../repositories/machine_activity_repository.dart';

/// CUU08: registra una actividad de maquinaria validando los campos requeridos
/// según el tipo (R018–R021).
class RegisterMachineActivityUseCase {
  RegisterMachineActivityUseCase(this._repository);

  final MachineActivityRepository _repository;

  Future<void> execute(MachineActivity activity) async {
    _validateFields(activity);
    await _repository.create(activity);
  }

  void _validateFields(MachineActivity activity) {
    switch (activity.type) {
      case MachineActivityType.FUEL:
        // R018: litros + comprobante. R019: el gasto se discrimina por firma.
        if (activity.liters == null || activity.receipt == null) {
          throw const InvalidMachineActivityException(
            'El registro de combustible requiere litros y comprobante.',
          );
        }
        if (activity.companyId == null) {
          throw const InvalidMachineActivityException(
            'El registro de combustible requiere una firma (companyId).',
          );
        }
      case MachineActivityType.MAINTENANCE:
      case MachineActivityType.REPAIR:
        // R020: costos + repuestos.
        if (activity.cost == null || activity.spareParts == null) {
          throw const InvalidMachineActivityException(
            'Mantenimiento/reparación requiere costo y repuestos.',
          );
        }
      case MachineActivityType.FIELD_USAGE:
        // R021: horas + hectáreas.
        if (activity.usageHours == null || activity.hectares == null) {
          throw const InvalidMachineActivityException(
            'Uso en campo requiere horas y hectáreas.',
          );
        }
    }
  }
}
