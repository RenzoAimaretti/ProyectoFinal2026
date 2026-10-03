import 'package:flutter/foundation.dart';

import '../../domain/models/catalogs.dart';
import '../../domain/models/machine_activity.dart';
import '../../domain/repositories/company_reader.dart';
import '../../domain/repositories/machine_reader.dart';
import '../../domain/usecases/register_machine_activity_usecase.dart';

/// ViewModel del formulario de alta de actividad de maquinaria (CUU08).
///
/// Recibe use case + readers por constructor (composition root) y expone los
/// streams de catálogo (máquinas y firmas/razones sociales) que alimentan los
/// selectores. El guardado delega en [RegisterMachineActivityUseCase], que
/// valida por tipo (R018–R021).
class MachineActivityFormViewModel extends ChangeNotifier {
  MachineActivityFormViewModel({
    required RegisterMachineActivityUseCase registerUseCase,
    required MachineReader machineReader,
    required CompanyReader companyReader,
  })  : _registerUseCase = registerUseCase,
        _machineReader = machineReader,
        _companyReader = companyReader;

  final RegisterMachineActivityUseCase _registerUseCase;
  final MachineReader _machineReader;
  final CompanyReader _companyReader;

  // ── Catálogos (streams de drift) ────────────────────────────────────────

  /// Máquinas para el selector (todas, demo).
  Stream<List<Machine>> get machines => _machineReader.watchAll();

  /// Firmas/razones sociales para discriminar el costo de combustible (R019).
  Stream<List<Company>> get companies => _companyReader.watchAll();

  // ── Guardado ────────────────────────────────────────────────────────────

  bool _isSaving = false;
  bool get isSaving => _isSaving;

  /// Persiste la actividad (delega las validaciones al use case).
  Future<void> register(MachineActivity activity) async {
    _isSaving = true;
    notifyListeners();
    try {
      await _registerUseCase.execute(activity);
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }
}
