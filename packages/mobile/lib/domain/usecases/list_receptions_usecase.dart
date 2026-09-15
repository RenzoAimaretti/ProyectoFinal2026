import 'dart:async';

import '../models/reception.dart';
import '../repositories/reception_repository.dart';

/// CUU06: lista todas las recepciones en solo-lectura (stream).
class ListReceptionsUseCase {
  ListReceptionsUseCase(this._repository);

  final ReceptionRepository _repository;

  Stream<List<Reception>> execute() => _repository.watchAll();
}
