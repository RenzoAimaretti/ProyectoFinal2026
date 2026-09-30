import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/services/daily_report_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';

/// 6.4 — `DailyReportApiService`: clasificación de respuestas HTTP.
void main() {
  group('DailyReportApiService.create', () {
    test('200 → sin excepción', () async {
      final mock = MockClient((request) async {
        expect(request.url.path, '/daily-reports');
        expect(request.method, 'POST');
        expect(request.headers['Authorization'], 'Bearer tok');
        return http.Response(jsonEncode({'id': 'x'}), 201);
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      await service.create(
        token: 'tok',
        payload: {'id': 'x', 'taskId': 't1', 'date': '2026-01-01', 'hectares': 1, 'hours': 2, 'items': []},
      );
    });

    test('401 → SyncUnauthorizedException', () async {
      final mock = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Token inválido'}), 401);
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.create(token: 'tok', payload: const {}),
        throwsA(isA<SyncUnauthorizedException>()),
      );
    });

    test('404 → SyncPermanentException', () async {
      final mock = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Task not found'}), 404);
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.create(token: 'tok', payload: const {}),
        throwsA(isA<SyncPermanentException>()
            .having((e) => e.message, 'message', contains('Task not found'))),
      );
    });

    test('500 → SyncRetriableException', () async {
      final mock = MockClient((request) async {
        return http.Response('{}', 500);
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.create(token: 'tok', payload: const {}),
        throwsA(isA<SyncRetriableException>()),
      );
    });

    test('SocketException → SyncRetriableException', () async {
      final mock = MockClient((request) async {
        throw const SocketException('no network');
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.create(token: 'tok', payload: const {}),
        throwsA(isA<SyncRetriableException>()),
      );
    });
  });

  group('DailyReportApiService.fetchAll', () {
    test('mapea status ES→EN', () async {
      final mock = MockClient((request) async {
        return http.Response(
          jsonEncode([
            {
              'id': 'r1',
              'taskId': 't1',
              'date': '2026-01-01T00:00:00.000Z',
              'hectares': 1.5,
              'hours': 2.0,
              'status': 'PENDIENTE_APROBACION',
            },
          ]),
          200,
        );
      });

      final service = DailyReportApiService(
          client: mock, baseUrl: 'http://test.api');

      final result = await service.fetchAll(token: 'tok');

      expect(result, hasLength(1));
      expect(result.first.id, 'r1');
      expect(result.first.status, DailyReportStatus.PENDING_APPROVAL);
    });
  });
}
