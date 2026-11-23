import 'dart:async';

/// Dispara un ciclo de sincronización cuando se encola una fila nueva en el
/// outbox (por ejemplo, al guardar un parte), así no espera a que la app vuelva
/// a primer plano o recupere la conexión.
///
/// Observa la cantidad TOTAL de filas de la cola, no las pendientes: un
/// reintento (`PROCESSING → PENDING`) no cambia el total y un envío exitoso lo
/// baja, así que solo un alta lo sube. Eso evita un ciclo que se re-dispara a
/// sí mismo. El primer valor no dispara: el arranque ya sincroniza.
class OutboxSyncTrigger {
  OutboxSyncTrigger({
    required Stream<int> queuedRows,
    required Future<void> Function() runSync,
  })  : _queuedRows = queuedRows,
        _runSync = runSync;

  final Stream<int> _queuedRows;
  final Future<void> Function() _runSync;

  StreamSubscription<int> start() {
    int? previous;
    return _queuedRows.listen((count) {
      final before = previous;
      previous = count;
      if (before != null && count > before) unawaited(_runSync());
    });
  }
}
