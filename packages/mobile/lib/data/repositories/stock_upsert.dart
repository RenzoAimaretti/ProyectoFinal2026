import 'package:drift/drift.dart';

import '../services/app_database.dart';

/// Incrementa (o crea, si no existe) el stock de `(clientId, inputId)` en
/// `delta`, resolviendo el `UNIQUE(clientId, inputId)` con un `ON CONFLICT`.
///
/// Helper compartido por `DriftReceptionRepository` y `DriftStockRepository`:
/// ambos materializan el mismo incremento sin invocarse entre sí (los
/// adaptadores no se llaman entre sí). Debe ejecutarse dentro de una
/// transacción abierta por el adaptador que lo invoca.
Future<void> upsertStockIncrement(
  AppDatabase db,
  String clientId,
  String inputId,
  double delta,
) {
  return db.into(db.stocks).insert(
        StocksCompanion.insert(
          clientId: clientId,
          inputId: inputId,
          quantity: delta,
        ),
        onConflict: DoUpdate(
          (old) => StocksCompanion.custom(
            quantity: old.quantity + Constant(delta),
            updatedAt: Variable(DateTime.now()),
          ),
          target: [db.stocks.clientId, db.stocks.inputId],
        ),
      );
}
