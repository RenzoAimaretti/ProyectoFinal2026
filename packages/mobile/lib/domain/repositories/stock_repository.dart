import 'dart:async';

import '../models/stock.dart';

/// Stock global por cliente (CUU06).
abstract class StockRepository {
  /// Incrementa (o crea, si no existe) el stock de `(clientId, inputId)` en
  /// `delta`. Resuelve el `UNIQUE(clientId, inputId)` en el adaptador.
  Future<void> upsertIncrement(String clientId, String inputId, double delta);

  Stream<List<Stock>> watchByClient(String clientId);
}
