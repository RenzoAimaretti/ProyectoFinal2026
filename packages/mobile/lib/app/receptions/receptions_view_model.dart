import 'dart:async';

import '../../domain/models/reception.dart';
import '../../domain/usecases/list_pending_receptions_usecase.dart';
import '../../domain/usecases/validate_reception_usecase.dart';

/// ViewModel de la bandeja de recepciones de insumos (CUU06, lista).
///
/// Expone un `Stream<List<Reception>>` de las recepciones pendientes de
/// validación, alimentado por el `watch` de drift: la vista se refresca sola
/// ante cada insert o validación. La acción de validar delega en
/// [ValidateReceptionUseCase].
class ReceptionsViewModel {
  ReceptionsViewModel(this._listUseCase, this._validateUseCase);

  final ListPendingReceptionsUseCase _listUseCase;
  final ValidateReceptionUseCase _validateUseCase;

  /// Recepciones en estado `PENDING_VALIDATION`.
  Stream<List<Reception>> get pendingReceptions => _listUseCase.execute();

  /// Valida una recepción (status → VALIDATED + Stock en la misma tx — R017).
  Future<void> validate(String id, {required String validatedBy}) {
    return _validateUseCase.execute(id, validatedBy);
  }
}
