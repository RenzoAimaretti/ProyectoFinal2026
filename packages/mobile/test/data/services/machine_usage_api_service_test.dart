import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/services/machine_usage_api_service.dart';
import 'package:mobile/domain/errors.dart';

/// T12 — `MachineUsageApiService` clasifica la respuesta HTTP y envía el
/// payload de uso por tarea al endpoint correcto.
void main() {
  test('POST /machine-usages con el payload capturado', () async {
    late Map<String, dynamic> sent;
    final mock = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/machine-usages');
      expect(request.headers['Authorization'], 'Bearer tok');
      sent = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(jsonEncode({'id': 'usage-1'}), 201);
    });

    final service =
        MachineUsageApiService(client: mock, baseUrl: 'http://test.api');
    await service.create(
      token: 'tok',
      payload: {
        'id': 'usage-1',
        'machineId': 'machine-1',
        'taskId': 'task-1',
        'operatorId': 'operator-1',
        'usageHours': 2.0,
        'hectares': 7.0,
        'workDate': '2026-03-08',
        'observations': 'Turno noche',
      },
    );

    expect(sent['id'], 'usage-1');
    expect(sent['taskId'], 'task-1');
    expect(sent['workDate'], '2026-03-08');
    expect(sent['observations'], 'Turno noche');
  });

  test('401 → SyncUnauthorizedException', () async {
    final mock = MockClient((request) async =>
        http.Response(jsonEncode({'message': 'Token inválido'}), 401));
    final service =
        MachineUsageApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.create(token: 'tok', payload: const {}),
      throwsA(isA<SyncUnauthorizedException>()),
    );
  });

  test('409 por reintento con datos distintos → SyncPermanentException', () async {
    final mock = MockClient((request) async => http.Response(
        jsonEncode({'message': 'Usage ID already exists with different data'}),
        409));
    final service =
        MachineUsageApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.create(token: 'tok', payload: const {}),
      throwsA(isA<SyncPermanentException>()),
    );
  });

  test('500 → SyncRetriableException', () async {
    final mock = MockClient((request) async => http.Response('{}', 500));
    final service =
        MachineUsageApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.create(token: 'tok', payload: const {}),
      throwsA(isA<SyncRetriableException>()),
    );
  });

  test('red caída → SyncRetriableException', () async {
    final mock = MockClient((request) async {
      throw const SocketException('no network');
    });
    final service =
        MachineUsageApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.create(token: 'tok', payload: const {}),
      throwsA(isA<SyncRetriableException>()),
    );
  });
}
