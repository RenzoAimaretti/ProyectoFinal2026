import 'dart:async';

import '../../domain/models/reception_summary.dart';
import '../../domain/usecases/list_receptions_usecase.dart';

/// ViewModel de la bandeja de recepciones de insumos (CUU06, lista).
///
/// Solo lectura: expone TODAS las recepciones (cualquier estado) con el nombre
/// de cliente resuelto, vía `ListReceptionsUseCase`. La validación ya no vive
/// en el móvil (responsabilidad del administrador en el web), por lo que no
/// hay acción `validate`.
class ReceptionsViewModel {
  ReceptionsViewModel(this._listUseCase);

  final ListReceptionsUseCase _listUseCase;

  /// Todas las recepciones con `clientName` resuelto, ordenadas por fecha desc.
  Stream<List<ReceptionSummary>> get receptions =>
      _listUseCase.watchSummaries();
}
