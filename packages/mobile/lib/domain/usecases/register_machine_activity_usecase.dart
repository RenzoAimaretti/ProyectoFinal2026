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
    // La fecha es un registro del pasado/día actual, nunca futura.
    if (activity.date.isAfter(DateTime.now())) {
      throw const InvalidMachineActivityException(
        'La fecha no puede ser futura.',
      );
    }

    switch (activity.type) {
      case MachineActivityType.FUEL:
        // R018/R019: litros > 0 + firma que asume el costo. El comprobante se
        // recolecta pero no es obligatorio para el demo (espejo del prototipo).
        if (activity.liters == null || activity.liters! <= 0) {
          throw const InvalidMachineActivityException(
            'Los litros de combustible deben ser mayores a 0.',
          );
        }
        if (activity.companyId == null || activity.companyId!.trim().isEmpty) {
          throw const InvalidMachineActivityException(
            'El registro de combustible requiere una firma.',
          );
        }
        break;
      case MachineActivityType.MAINTENANCE:
      case MachineActivityType.REPAIR:
        // R020: costo > 0 + descripción del trabajo no vacía.
        if (activity.cost == null || activity.cost! <= 0) {
          throw const InvalidMachineActivityException(
            'El costo debe ser mayor a 0.',
          );
        }
        if (activity.spareParts == null ||
            activity.spareParts!.trim().isEmpty) {
          throw const InvalidMachineActivityException(
            'La descripción del trabajo es obligatoria.',
          );
        }
        break;
      case MachineActivityType.FIELD_USAGE:
        // R021: horas > 0 + hectáreas > 0.
        if (activity.usageHours == null || activity.usageHours! <= 0) {
          throw const InvalidMachineActivityException(
            'Las horas de uso deben ser mayores a 0.',
          );
        }
        if (activity.hectares == null || activity.hectares! <= 0) {
          throw const InvalidMachineActivityException(
            'Las hectáreas deben ser mayores a 0.',
          );
        }
        break;
    }
  }
}
