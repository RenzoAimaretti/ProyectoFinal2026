import 'dart:async';

import '../models/reception.dart';

/// Persistencia de recepciones de insumos (CUU06).
abstract class ReceptionRepository {
  /// Crea cabecera + ítems en una única transacción.
  Future<void> create(Reception reception, List<ReceptionItem> items);

  Stream<List<Reception>> watchPending();

  /// Valida la recepción e incrementa el `Stock` del cliente en la MISMA
  /// transacción (status → VALIDATED + Stock + SyncQueue atómico — R017).
  Future<void> validateAndApplyStock(String id, String validatedBy);
}
