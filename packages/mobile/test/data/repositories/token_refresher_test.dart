import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/repositories/token_refresher.dart';
import 'package:mobile/data/services/auth_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/repositories/session_repository.dart';

/// 6.4 — `TokenRefresher`: ok persiste sesión nueva / falla limpia sesión.
void main() {
  Session sessionWithRefresh() => Session(
        userId: 'u1',
        email: 'e@e.com',
        fullName: 'U',
        role: UserRole.operario,
        token: 'old-token',
        refreshToken: 'old-ref',
        lastAccessedAt: DateTime(2026, 1, 1),
      );

  group('TokenRefresher', () {
    test('refresh ok: persiste sesión nueva y devuelve el access token', () async {
      final sessionRepo = _FakeSessionRepository()..seed(sessionWithRefresh());
      final mock = MockClient((request) async {
        expect(request.url.path, '/auth/refresh');
        return http.Response(
          jsonEncode({'accessToken': 'new-token', 'refreshToken': 'new-ref'}),
          200,
        );
      });
      final sut = TokenRefresher(
        AuthApiService(client: mock, baseUrl: 'http://test.api'),
        sessionRepo,
      );

      final token = await sut.refreshAccessToken();

      expect(token, 'new-token');
      expect(sessionRepo.saved!.token, 'new-token');
      expect(sessionRepo.saved!.refreshToken, 'new-ref');
      expect(sessionRepo.clearCalled, isFalse);
    });

    test('sin refreshToken: limpia y lanza SyncPermanentException', () async {
      final sessionRepo = _FakeSessionRepository()
        ..seed(Session(
          userId: 'u1',
          email: 'e@e.com',
          fullName: 'U',
          role: UserRole.operario,
          token: 'tok',
          lastAccessedAt: DateTime(2026, 1, 1),
        ));
      final sut = TokenRefresher(AuthApiService(), sessionRepo);

      await expectLater(
        sut.refreshAccessToken(),
        throwsA(isA<SyncPermanentException>()),
      );
      expect(sessionRepo.clearCalled, isTrue);
    });

    test('refresh falla (AuthException): limpia y lanza SyncPermanentException',
        () async {
      final sessionRepo = _FakeSessionRepository()..seed(sessionWithRefresh());
      final mock = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'invalid'}), 401);
      });
      final sut = TokenRefresher(
        AuthApiService(client: mock, baseUrl: 'http://test.api'),
        sessionRepo,
      );

      await expectLater(
        sut.refreshAccessToken(),
        throwsA(isA<SyncPermanentException>()),
      );
      expect(sessionRepo.clearCalled, isTrue);
    });
  });
}

class _FakeSessionRepository implements SessionRepository {
  Session? _session;
  bool clearCalled = false;
  Session? saved;

  void seed(Session session) => _session = session;

  @override
  Future<Session?> current() async => _session;

  @override
  Future<void> save(Session session) async {
    saved = session;
    _session = session;
  }

  @override
  Future<void> clear() async {
    clearCalled = true;
    _session = null;
  }
}
