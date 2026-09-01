import 'dart:async';

import '../models/reception.dart';
import '../repositories/reception_repository.dart';

/// CUU06: recepciones pendientes de validación (stream).
class ListPendingReceptionsUseCase {
  ListPendingReceptionsUseCase(this._repository);

  final ReceptionRepository _repository;

  Stream<List<Reception>> execute() => _repository.watchPending();
}
