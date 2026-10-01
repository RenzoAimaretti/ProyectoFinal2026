import 'dart:async';

import '../errors.dart';
import '../models/sync_queue_item.dart';
import '../repositories/sync_queue_repository.dart';
import 'sync_delay_port.dart';
import 'sync_entity_handler.dart';

/// Política de backoff exponencial (design §2.2).
///
/// Delay de cada reintento = `min(base·2^(attempt−1), maxDelay)`. El intento
/// máximo es `maxAttempts` (contando el primero); 4xx no reintenta (lo decide
/// el handler lanzando [SyncPermanentException]).
class SyncBackoffPolicy {
  const SyncBackoffPolicy({
    this.base = const Duration(seconds: 2),
    this.factor = 2,
    this.maxDelay = const Duration(seconds: 30),
    this.maxAttempts = 5,
  });

  final Duration base;
  final int factor;
  final Duration maxDelay;
  final int maxAttempts;

  /// Delay a aplicar tras el intento número [attempts] (1-based).
  ///
  /// attempts=1 → base; attempts=2 → base·factor; … acotado a [maxDelay].
  Duration delayForAttempt(int attempts) {
    var seconds = base.inSeconds;
    for (var i = 1; i < attempts; i++) {
      seconds *= factor;
    }
    if (seconds > maxDelay.inSeconds) {
      seconds = maxDelay.inSeconds;
    }
    return Duration(seconds: seconds);
  }
}

/// Orquestador del outbox (push-only, genérico).
///
/// Drena `SyncQueue` en FIFO, despacha por `entity` a un registry de handlers
/// y aplica retry/backoff. No conoce entidades concretas ni drift/http: solo
/// depende de los puertos. `runCycle()` es la única API pública; sin timers,
/// los disparadores viven en el composition root (`main.dart`).
class SyncEngine {
  SyncEngine({
    required SyncQueuePort queue,
    required Map<String, SyncEntityHandler> handlers,
    required SyncDelayPort delayer,
    SyncBackoffPolicy backoff = const SyncBackoffPolicy(),
  })  : _queue = queue,
        _handlers = handlers,
        _delayer = delayer,
        _backoff = backoff;

  final SyncQueuePort _queue;
  final Map<String, SyncEntityHandler> _handlers;
  final SyncDelayPort _delayer;
  final SyncBackoffPolicy _backoff;

  bool _running = false;

  /// Ejecuta un ciclo de sincronización. Guard contra reentrancia: si ya hay
  /// un ciclo en curso, esta llamada retorna sin hacer nada.
  Future<void> runCycle() async {
    if (_running) return;
    _running = true;
    try {
      await _run();
    } finally {
      _running = false;
    }
  }

  Future<void> _run() async {
    await _queue.recoverInterrupted();

    while (true) {
      final batch = await _queue.nextPendingBatch(limit: 10);
      if (batch.isEmpty) return;

      var progressed = false;
      for (final item in batch) {
        final handler = _handlers[item.entity];
        if (handler == null) {
          // Entidad sin handler registrado: queda PENDING (habilitación futura
          // sin tocar el engine).
          continue;
        }
        progressed = true;

        await _queue.markProcessing(item.id);

        try {
          await _processWithRetry(item, handler);
        } on SyncPermanentException catch (e) {
          await _queue.markFailed(item.id, e.message);
        }
      }

      // Si el batch no progresó (solo filas sin handler), terminamos para no
      // girar en un bucle infinito con una cola inmanejable.
      if (!progressed) return;
    }
  }

  /// Procesa una fila con retry in-place (design §2.1): el error retriable
  /// requeuea y reintenta la MISMA fila en memoria (no se re-lee el batch).
  Future<void> _processWithRetry(
    SyncQueueItem item,
    SyncEntityHandler handler,
  ) async {
    var attempts = item.attempts;
    while (true) {
      try {
        await handler.handle(item);
        await _queue.markDone(item.id);
        return;
      } on SyncRetriableException catch (e) {
        attempts += 1;
        if (attempts >= _backoff.maxAttempts) {
          await _queue.markFailed(item.id, e.message);
          return;
        }
        await _queue.requeue(item.id, e.message);
        await _delayer.delay(_backoff.delayForAttempt(attempts));
      }
    }
  }
}
