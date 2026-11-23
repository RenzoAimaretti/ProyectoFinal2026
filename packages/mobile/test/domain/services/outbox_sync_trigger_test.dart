import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/services/outbox_sync_trigger.dart';

void main() {
  late StreamController<int> queuedRows;
  late int runs;
  late StreamSubscription<int> subscription;

  setUp(() {
    queuedRows = StreamController<int>();
    runs = 0;
    subscription = OutboxSyncTrigger(
      queuedRows: queuedRows.stream,
      runSync: () async => runs++,
    ).start();
  });

  tearDown(() async {
    await subscription.cancel();
    await queuedRows.close();
  });

  Future<void> emit(int count) async {
    queuedRows.add(count);
    await pumpEventQueue();
  }

  test('el valor inicial no dispara (el arranque ya sincroniza)', () async {
    await emit(2);

    expect(runs, 0);
  });

  test('una fila nueva en la cola dispara un ciclo', () async {
    await emit(0);
    await emit(1);

    expect(runs, 1);
  });

  test('enviar (la fila se borra) o reintentar (el total no cambia) no dispara',
      () async {
    await emit(1);
    await emit(1);
    await emit(0);

    expect(runs, 0);
  });

  test('cada alta posterior vuelve a disparar', () async {
    await emit(0);
    await emit(1);
    await emit(0);
    await emit(1);
    await emit(2);

    expect(runs, 3);
  });
}
