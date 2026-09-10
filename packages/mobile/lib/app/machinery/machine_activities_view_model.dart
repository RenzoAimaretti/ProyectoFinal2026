import 'dart:async';

import '../../domain/models/machine_activity.dart';
import '../../domain/usecases/list_machine_activities_usecase.dart';

/// ViewModel del historial de actividades de maquinaria (CUU08, lista).
///
/// Expone un `Stream<List<MachineActivity>>` global (todas las máquinas) para
/// el demo, alimentado por el `watch` de drift: la vista se refresca sola ante
/// cada insert. En producción este listado se filtraría por máquina vía
/// `watchByMachine`.
class MachineActivitiesViewModel {
  MachineActivitiesViewModel(this._listUseCase);

  final ListMachineActivitiesUseCase _listUseCase;

  /// Historial global de actividades, ordenado por fecha descendente.
  Stream<List<MachineActivity>> get activities => _listUseCase.watchAll();
}
