import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/repositories/daily_report_sync_handler.dart';
import 'package:mobile/data/repositories/drift_daily_report_repository.dart';
import 'package:mobile/data/repositories/token_refresher.dart';
import 'package:mobile/data/services/app_database.dart' hide DailyReport, DailyReportItem;
import 'package:mobile/data/services/auth_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/models/sync_queue_item.dart';
import 'package:mobile/domain/repositories/daily_report_remote_repository.dart';
import 'package:mobile/domain/repositories/session_repository.dart';

import 'drift_test_helper.dart';

/// 6.3 — el handler resuelve `{id, taskId, date, hectares, hours, items[]}`
/// desde drift y refresca el token ante 401 con un solo retry.
void main() {
  late AppDatabase db;
  late DriftDailyReportRepository repository;

  setUp(() async {
    db = createTestDatabase();
    repository = DriftDailyReportRepository(db);

    await db.into(db.companies).insert(CompaniesCompanion.insert(
          id: Value('company-1'),
          name: 'Firma Test',
          cuit: '30-12345678-9',
        ));
    await db.into(db.clients).insert(ClientsCompanion.insert(
          id: Value('client-1'),
          name: 'Cliente Test',
        ));
    await db.into(db.farms).insert(FarmsCompanion.insert(
          id: Value('farm-1'),
          clientId: 'client-1',
          name: 'Campo Test',
          surface: 500.0,
        ));
    await db.into(db.lots).insert(LotsCompanion.insert(
          id: Value('lot-1'),
          farmId: 'farm-1',
          name: 'Lote 1',
          area: 100.0,
        ));
    await db.into(db.laborTypes).insert(LaborTypesCompanion.insert(
          id: Value('labor-1'),
          name: 'Siembra',
        ));
    await db.into(db.inputs).insert(InputsCompanion.insert(
          id: Value('input-1'),
          name: 'Glifosato',
          unit: 'L',
        ));
    await db.into(db.tasks).insert(TasksCompanion.insert(
          id: Value('task-1'),
          lotId: 'lot-1',
          laborTypeId: 'labor-1',
          status: 'PENDING',
        ));
  });

  tearDown(() => db.close());

  DailyReport newReport() => DailyReport(
        operatorId: 'op-1',
        companyId: 'company-1',
        taskId: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        date: DateTime(2026, 6, 15),
        hectares: 10.0,
        hours: 8.0,
        status: DailyReportStatus.PENDING_APPROVAL,
      );

  SyncQueueItem itemFor(String id) => SyncQueueItem(
        id: 'q-1',
        entity: 'DAILY_REPORT',
        entityId: id,
        operation: SyncOperation.CREATE,
        attempts: 0,
      );

  test('resuelve el payload desde drift y lo empuja con el token', () async {
    final items = [
      const DailyReportItem(inputId: 'input-1', quantity: 5, unit: 'L'),
    ];
    final reportId = await repository.create(newReport(), items);

    final sessionRepo = _FakeSessionRepository()
      ..seed(Session(
        userId: 'u1',
        email: 'e@e.com',
        fullName: 'U',
        role: UserRole.operario,
        token: 'tok',
        refreshToken: 'ref',
        lastAccessedAt: DateTime(2026, 1, 1),
      ));
    final remote = _FakeRemoteRepo();

    final handler = DailyReportSyncHandler(
      db: db,
      remoteRepository: remote,
      sessionRepository: sessionRepo,
      tokenRefresher: TokenRefresher(AuthApiService(), sessionRepo),
    );

    await handler.handle(itemFor(reportId));

    expect(remote.calls, hasLength(1));
    final call = remote.calls.single;
    expect(call.token, 'tok');
    expect(call.report.id, reportId);
    expect(call.report.taskId, 'task-1');
    expect(call.report.hectares, 10.0);
    expect(call.report.hours, 8.0);
    expect(call.items, hasLength(1));
    expect(call.items.single.inputId, 'input-1');
    expect(call.items.single.quantity, 5);
    expect(call.items.single.unit, 'L');
  });

  test('401 → refresca el token y reintenta UNA vez', () async {
    final reportId = await repository.create(newReport(), const []);

    final sessionRepo = _FakeSessionRepository()
      ..seed(Session(
        userId: 'u1',
        email: 'e@e.com',
        fullName: 'U',
        role: UserRole.operario,
        token: 'old-tok',
        refreshToken: 'old-ref',
        lastAccessedAt: DateTime(2026, 1, 1),
      ));
    final remote = _FakeRemoteRepo()
      ..firstError = const SyncUnauthorizedException('expired');

    final mock = MockClient((request) async {
      expect(request.url.path, '/auth/refresh');
      return http.Response(
        jsonEncode({'accessToken': 'new-tok', 'refreshToken': 'new-ref'}),
        200,
      );
    });

    final handler = DailyReportSyncHandler(
      db: db,
      remoteRepository: remote,
      sessionRepository: sessionRepo,
      tokenRefresher: TokenRefresher(
        AuthApiService(client: mock, baseUrl: 'http://test.api'),
        sessionRepo,
      ),
    );

    await handler.handle(itemFor(reportId));

    expect(remote.calls, hasLength(2));
    expect(remote.calls[0].token, 'old-tok');
    expect(remote.calls[1].token, 'new-tok');
  });

  test('parte inexistente → SyncPermanentException', () async {
    final sessionRepo = _FakeSessionRepository()
      ..seed(Session(
        userId: 'u1',
        email: 'e@e.com',
        fullName: 'U',
        role: UserRole.operario,
        token: 'tok',
        lastAccessedAt: DateTime(2026, 1, 1),
      ));
    final handler = DailyReportSyncHandler(
      db: db,
      remoteRepository: _FakeRemoteRepo(),
      sessionRepository: sessionRepo,
      tokenRefresher: TokenRefresher(AuthApiService(), sessionRepo),
    );

    await expectLater(
      handler.handle(itemFor('missing')),
      throwsA(isA<SyncPermanentException>()),
    );
  });
}

class _PushCall {
  _PushCall(this.report, this.items, this.token);
  final DailyReport report;
  final List<DailyReportItem> items;
  final String token;
}

class _FakeRemoteRepo implements DailyReportRemoteRepository {
  final List<_PushCall> calls = [];
  Exception? firstError;

  @override
  Future<void> push(
    DailyReport report,
    List<DailyReportItem> items, {
    required String token,
  }) async {
    calls.add(_PushCall(report, items, token));
    if (firstError != null) {
      final e = firstError!;
      firstError = null;
      throw e;
    }
  }
}

class _FakeSessionRepository implements SessionRepository {
  Session? _session;
  bool clearCalled = false;

  void seed(Session session) => _session = session;

  @override
  Future<Session?> current() async => _session;

  @override
  Future<void> save(Session session) async => _session = session;

  @override
  Future<void> clear() async {
    clearCalled = true;
    _session = null;
  }
}
