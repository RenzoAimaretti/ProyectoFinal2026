import 'dart:async';

import '../models/enums.dart';
import '../models/reception.dart';
import '../repositories/reception_repository.dart';

/// CUU06: crea una recepción (cabecera + ítems) con estado inicial
/// [ReceptionStatus.PENDING_VALIDATION].
class CreateReceptionUseCase {
  CreateReceptionUseCase(this._repository);

  final ReceptionRepository _repository;

  Future<void> execute({
    required String clientId,
    required DateTime date,
    required List<ReceptionItem> items,
  }) async {
    final reception = Reception(
      clientId: clientId,
      date: date,
      status: ReceptionStatus.PENDING_VALIDATION,
    );

    await _repository.create(reception, items);
  }
}
