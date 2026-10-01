import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/sync_queue_item.dart';
import 'package:mobile/domain/repositories/sync_queue_repository.dart';
import 'package:mobile/domain/services/sync_delay_port.dart';
import 'package:mobile/domain/services/sync_engine.dart';
import 'package:mobile/domain/services/sync_entity_handler.dart';

/// Fakes in-memory para el [SyncEngine] (sin drift ni HTTP).
void main() {
  group('SyncEngine', () {
    late FakeSyncQueue queue;
    late FakeDelayer delayer;

    setUp(() {
      queue = FakeSyncQueue();
      delayer = FakeDelayer();
    });

    SyncEngine buildEngine(Map<String, SyncEntityHandler> handlers) {
      return SyncEngine(queue: queue, handlers: handlers, delayer: delayer);
    }

    test('FIFO: drena la fila más antigua primero', () async {
      queue.seed(id: 'older', entity: 'DAILY_REPORT', entityId: 'r1',
          createdAt: DateTime(2026, 1, 1));
      queue.seed(id: 'newer', entity: 'DAILY_REPORT', entityId: 'r2',
          createdAt: DateTime(2026, 1, 2));

      final handler = FakeHandler((_) async {});
      await buildEngine({'DAILY_REPORT': handler}).runCycle();

      expect(handler.handled.map((i) => i.id), ['older', 'newer']);
      expect(queue.rows, isEmpty); // ambas DONE (borradas)
    });

    test('entidad sin handler queda PENDING (no se procesa)', () async {
      queue.seed(id: 'x', entity: 'UNKNOWN', entityId: 'r1');

      await buildEngine({}).runCycle();

      expect(queue.pendingIds, contains('x'));
      expect(queue.rows, hasLength(1));
    });

    test('DONE borra la fila (markDone)', () async {
      queue.seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1');
      final handler = FakeHandler((_) async {});

      await buildEngine({'DAILY_REPORT': handler}).runCycle();

      expect(queue.rows, isEmpty);
    });

    test('4xx → FAILED inmediato y continúa con la siguiente PENDING', () async {
      queue.seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1',
          createdAt: DateTime(2026, 1, 1));
      queue.seed(id: 'b', entity: 'DAILY_REPORT', entityId: 'r2',
          createdAt: DateTime(2026, 1, 2));

      final handler = FakeHandler((item) async {
        if (item.entityId == 'r1') {
          throw const SyncPermanentException('task no existe');
        }
        // r2: éxito
      });

      await buildEngine({'DAILY_REPORT': handler}).runCycle();

      expect(queue.failedIds, ['a']);
      expect(queue.lastErrorOf('a'), 'task no existe');
      expect(queue.attemptsOf('a'), 1);
      // r2 fue procesada y borrada (no aparece en rows).
      expect(queue.rows.map((r) => r.id), ['a']);
    });

    test('5xx/red → requeue + delays 2/4/8/16 s → FAILED al 5º intento', () async {
      queue.seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1');
      final handler = FakeHandler(
        (_) async => throw const SyncRetriableException('500'),
      );

      await buildEngine({'DAILY_REPORT': handler}).runCycle();

      expect(handler.handled, hasLength(5)); // 5 llamadas (contando la primera)
      expect(delayer.delays, const [
        Duration(seconds: 2),
        Duration(seconds: 4),
        Duration(seconds: 8),
        Duration(seconds: 16),
      ]);
      expect(queue.failedIds, ['a']);
      expect(queue.attemptsOf('a'), 5);
    });

    test('recoverInterrupted corre al inicio del ciclo', () async {
      queue.seed(id: 'a', entity: 'DAILY_REPORT', entityId: 'r1',
          status: 'PROCESSING');
      final handler = FakeHandler((_) async {});

      await buildEngine({'DAILY_REPORT': handler}).runCycle();

      expect(queue.recoverCount, 1);
      // La fila PROCESSING se recuperó a PENDING y luego se procesó (DONE).
      expect(queue.rows, isEmpty);
    });
  });
}

// ─── Fakes ────────────────────────────────────────────────────────────────────

class FakeHandler implements SyncEntityHandler {
  FakeHandler(this._behavior);

  final Future<void> Function(SyncQueueItem) _behavior;
  final List<SyncQueueItem> handled = [];

  @override
  Future<void> handle(SyncQueueItem item) {
    handled.add(item);
    return _behavior(item);
  }
}

class FakeDelayer implements SyncDelayPort {
  final List<Duration> delays = [];

  @override
  Future<void> delay(Duration duration) async {
    delays.add(duration);
  }
}

class QueueRow {
  QueueRow({
    required this.id,
    required this.entity,
    required this.entityId,
    required this.operation,
    required this.createdAt,
    this.attempts = 0,
    this.status = 'PENDING',
    this.lastError,
  });

  final String id;
  final String entity;
  final String entityId;
  final SyncOperation operation;
  final DateTime createdAt;
  int attempts;
  String status;
  String? lastError;
}

class FakeSyncQueue implements SyncQueuePort {
  final List<QueueRow> _rows = [];
  int recoverCount = 0;

  void seed({
    required String id,
    required String entity,
    required String entityId,
    SyncOperation operation = SyncOperation.CREATE,
    int attempts = 0,
    String status = 'PENDING',
    String? lastError,
    DateTime? createdAt,
  }) {
    _rows.add(QueueRow(
      id: id,
      entity: entity,
      entityId: entityId,
      operation: operation,
      createdAt: createdAt ?? DateTime(2026, 1, 1),
      attempts: attempts,
      status: status,
      lastError: lastError,
    ));
  }

  List<QueueRow> get rows => List.unmodifiable(_rows);
  List<String> get pendingIds =>
      _rows.where((r) => r.status == 'PENDING').map((r) => r.id).toList();
  List<String> get failedIds =>
      _rows.where((r) => r.status == 'FAILED').map((r) => r.id).toList();
  int attemptsOf(String id) => _rows.firstWhere((r) => r.id == id).attempts;
  String? lastErrorOf(String id) => _rows.firstWhere((r) => r.id == id).lastError;

  @override
  Future<List<SyncQueueItem>> nextPendingBatch({int limit = 10}) async {
    final pending = _rows.where((r) => r.status == 'PENDING').toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return pending
        .take(limit)
        .map((r) => SyncQueueItem(
              id: r.id,
              entity: r.entity,
              entityId: r.entityId,
              operation: r.operation,
              attempts: r.attempts,
            ))
        .toList();
  }

  @override
  Future<void> markProcessing(String id) async {
    _rows.firstWhere((r) => r.id == id).status = 'PROCESSING';
  }

  @override
  Future<void> markDone(String id) async {
    _rows.removeWhere((r) => r.id == id);
  }

  @override
  Future<void> requeue(String id, String lastError) async {
    final row = _rows.firstWhere((r) => r.id == id);
    row.status = 'PENDING';
    row.attempts += 1;
    row.lastError = lastError;
  }

  @override
  Future<void> markFailed(String id, String lastError) async {
    final row = _rows.firstWhere((r) => r.id == id);
    row.status = 'FAILED';
    row.attempts += 1;
    row.lastError = lastError;
  }

  @override
  Future<void> recoverInterrupted() async {
    recoverCount += 1;
    for (final row in _rows.where((r) => r.status == 'PROCESSING')) {
      row.status = 'PENDING';
    }
  }
}
