import 'dart:async';

import '../repositories/reception_repository.dart';

/// CUU06: valida una recepción. Delega en `validateAndApplyStock`, que valida e
/// incrementa el Stock en la misma transacción (R017).
class ValidateReceptionUseCase {
  ValidateReceptionUseCase(this._repository);

  final ReceptionRepository _repository;

  Future<void> execute(String id, String validatedBy) {
    return _repository.validateAndApplyStock(id, validatedBy);
  }
}
