import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/repositories/drift_machine_usage_repository.dart';
import 'package:mobile/data/repositories/machine_usage_sync_handler.dart';
import 'package:mobile/data/repositories/token_refresher.dart';
import 'package:mobile/data/services/app_database.dart' hide MachineUsage;
import 'package:mobile/data/services/auth_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_usage.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/models/sync_queue_item.dart';
import 'package:mobile/domain/repositories/machine_usage_remote_repository.dart';
import 'package:mobile/domain/repositories/session_repository.dart';

import 'drift_test_helper.dart';

/// T12 — el handler resuelve el uso desde drift y lo empuja con el UUID local
/// (idempotente en el backend) y refresca el token ante 401 una sola vez.
void main() {
  late AppDatabase db;
  late DriftMachineUsageRepository repository;

  setUp(() async {
    db = createTestDatabase();
    repository = DriftMachineUsageRepository(db);
    await _seedCatalog(db);
  });

  tearDown(() => db.close());

  SyncQueueItem itemFor(String id) => SyncQueueItem(
        id: 'q-1',
        entity: 'MACHINE_USAGE',
        entityId: id,
        operation: SyncOperation.CREATE,
        attempts: 0,
      );

  test('empuja el uso con id estable, fecha y notas desde drift', () async {
    await repository.create(MachineUsage(
      id: 'usage-1',
      machineId: 'machine-1',
      taskId: 'task-1',
      operatorId: 'operator-1',
      usageHours: 2,
      hectares: 7,
      workDate: DateTime.utc(2026, 3, 8),
      observations: 'Turno noche',
    ));
    final remote = _FakeRemote();
    final handler = MachineUsageSyncHandler(
      db: db,
      remoteRepository: remote,
      sessionRepository: _FakeSessions()..seed('tok'),
      tokenRefresher: TokenRefresher(AuthApiService(), _FakeSessions()),
    );

    await handler.handle(itemFor('usage-1'));

    expect(remote.calls, hasLength(1));
    final call = remote.calls.single;
    expect(call.token, 'tok');
    expect(call.payload['id'], 'usage-1');
    expect(call.payload['machineId'], 'machine-1');
    expect(call.payload['taskId'], 'task-1');
    expect(call.payload['operatorId'], 'operator-1');
    expect(call.payload['usageHours'], 2);
    expect(call.payload['hectares'], 7);
    expect(call.payload['workDate'], '2026-03-08');
    expect(call.payload['observations'], 'Turno noche');
  });

  test('401 → refresca el token y reintenta UNA vez', () async {
    await repository.create(MachineUsage(
      id: 'usage-2',
      machineId: 'machine-1',
      taskId: 'task-1',
      operatorId: 'operator-1',
      usageHours: 3,
      workDate: DateTime.utc(2026, 3, 9),
    ));
    final sessions = _FakeSessions()..seed('old-tok');
    final remote = _FakeRemote()
      ..firstError = const SyncUnauthorizedException('expired');
    final mock = MockClient((request) async {
      expect(request.url.path, '/auth/refresh');
      return http.Response(
        jsonEncode({'accessToken': 'new-tok', 'refreshToken': 'new-ref'}),
        200,
      );
    });

    final handler = MachineUsageSyncHandler(
      db: db,
      remoteRepository: remote,
      sessionRepository: sessions,
      tokenRefresher: TokenRefresher(
        AuthApiService(client: mock, baseUrl: 'http://test.api'),
        sessions,
      ),
    );

    await handler.handle(itemFor('usage-2'));

    expect(remote.calls, hasLength(2));
    expect(remote.calls[0].token, 'old-tok');
    expect(remote.calls[1].token, 'new-tok');
  });

  test('uso inexistente → SyncPermanentException', () async {
    final handler = MachineUsageSyncHandler(
      db: db,
      remoteRepository: _FakeRemote(),
      sessionRepository: _FakeSessions()..seed('tok'),
      tokenRefresher: TokenRefresher(AuthApiService(), _FakeSessions()),
    );

    await expectLater(
      handler.handle(itemFor('missing')),
      throwsA(isA<SyncPermanentException>()),
    );
  });

  test('sin sesión activa → SyncPermanentException', () async {
    await repository.create(MachineUsage(
      id: 'usage-3',
      machineId: 'machine-1',
      taskId: 'task-1',
      operatorId: 'operator-1',
      hectares: 4,
      workDate: DateTime.utc(2026, 3, 10),
    ));
    final handler = MachineUsageSyncHandler(
      db: db,
      remoteRepository: _FakeRemote(),
      sessionRepository: _FakeSessions(),
      tokenRefresher: TokenRefresher(AuthApiService(), _FakeSessions()),
    );

    await expectLater(
      handler.handle(itemFor('usage-3')),
      throwsA(isA<SyncPermanentException>()),
    );
  });
}

Future<void> _seedCatalog(AppDatabase db) async {
  await db.customStatement(
    "INSERT INTO companies (id, name, cuit, active, created_at, updated_at) "
    "VALUES ('company-1', 'Eliggi', '30-1-1', 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO labor_types (id, name, created_at, updated_at) "
    "VALUES ('labor-1', 'Siembra', 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO clients (id, name, active, created_at, updated_at) "
    "VALUES ('client-1', 'Cliente', 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO farms (id, client_id, name, surface, created_at, updated_at) "
    "VALUES ('farm-1', 'client-1', 'Campo', 100, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO lots (id, farm_id, name, area, active, created_at, updated_at) "
    "VALUES ('lot-1', 'farm-1', 'Lote', 50, 1, 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO machines (id, company_id, name, status, created_at, updated_at) "
    "VALUES ('machine-1', 'company-1', 'Tractor', 'ACTIVE', 0, 0)",
  );
  await db.customStatement(
    "INSERT INTO tasks (id, lot_id, labor_type_id, status, created_at, updated_at) "
    "VALUES ('task-1', 'lot-1', 'labor-1', 'PENDING', 0, 0)",
  );
}

class _Call {
  _Call(this.payload, this.token);
  final Map<String, dynamic> payload;
  final String token;
}

class _FakeRemote implements MachineUsageRemoteRepository {
  final List<_Call> calls = [];
  Exception? firstError;

  @override
  Future<void> push(
    Map<String, dynamic> payload, {
    required String token,
  }) async {
    calls.add(_Call(payload, token));
    if (firstError != null) {
      final error = firstError!;
      firstError = null;
      throw error;
    }
  }
}

class _FakeSessions implements SessionRepository {
  Session? _session;

  void seed(String token) {
    _session = Session(
      userId: 'u1',
      email: 'e@e.com',
      fullName: 'U',
      role: UserRole.operario,
      token: token,
      refreshToken: 'ref',
      lastAccessedAt: DateTime(2026, 1, 1),
    );
  }

  @override
  Future<Session?> current() async => _session;

  @override
  Future<void> save(Session session) async => _session = session;

  @override
  Future<void> clear() async => _session = null;
}
