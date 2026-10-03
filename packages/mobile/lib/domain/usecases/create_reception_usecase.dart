import 'dart:async';

import '../errors.dart';
import '../models/enums.dart';
import '../models/reception.dart';
import '../repositories/reception_repository.dart';

/// CUU06: crea una recepción (cabecera + ítems) con estado inicial
/// [ReceptionStatus.PENDING_VALIDATION].
class CreateReceptionUseCase {
  CreateReceptionUseCase(this._repository);

  final ReceptionRepository _repository;

  Future<String> execute({
    required String clientId,
    required DateTime date,
    required List<ReceptionItem> items,
  }) async {
    // Cada ítem de la recepción debe tener cantidad mayor a cero.
    for (final item in items) {
      if (item.quantity <= 0) {
        throw InvalidItemQuantityException(
          'La cantidad del insumo ${item.inputId} debe ser mayor a 0',
        );
      }
    }

    final reception = Reception(
      clientId: clientId,
      date: date,
      status: ReceptionStatus.PENDING_VALIDATION,
    );

    // Devuelve el id de la recepción para que el formulario asocie las fotos
    // (R008) a la entidad recién creada.
    return _repository.create(reception, items);
  }
}
