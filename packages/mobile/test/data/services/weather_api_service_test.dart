import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/services/weather_api_service.dart';
import 'package:mobile/domain/errors.dart';

/// 11.1 — `WeatherApiService`: contrato wire (design §2.8) y clasificación de
/// respuestas HTTP (patrón `daily_report_api_service_test.dart`).
String _body({bool stale = false, Object? probability = 10}) => jsonEncode({
      'source': 'open-meteo+rainviewer',
      'location': {
        'lat': -33.13,
        'lon': -61.0,
        'resolvedFrom': 'lot',
        'lotId': 'lot-1',
        'usedFarmFallback': false,
      },
      'current': {
        'temperatureC': 18.4,
        'windSpeedKnots': 5.3,
        'windDirectionDeg': 156,
        'precipitationMm': 0.1,
      },
      'hourly': const [],
      'daily': [
        {
          'date': '2026-10-15',
          'precipitationSumMm': 0.0,
          'precipitationProbabilityMax': probability,
        },
      ],
      'radar': null,
      'stale': stale,
      'fetchedAt': '2026-10-15T15:00:00.000Z',
    });

void main() {
  group('WeatherApiService.fetchCurrent', () {
    test('200 → mapea el contrato wire y usa Bearer + lat/lon', () async {
      final mock = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, '/weather/current');
        expect(request.url.queryParameters['lat'], '-33.13');
        expect(request.url.queryParameters['lon'], '-61.0');
        expect(request.headers['Authorization'], 'Bearer tok');
        return http.Response(_body(), 200);
      });

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      final reading =
          await service.fetchCurrent(token: 'tok', lat: -33.13, lon: -61.0);

      expect(reading.temperatureC, 18.4);
      expect(reading.windSpeedKnots, 5.3);
      expect(reading.windDirectionDeg, 156);
      expect(reading.precipitationMm, 0.1);
      expect(reading.precipitationProbabilityMax, 10);
      expect(reading.resolvedFrom, 'lot');
      expect(reading.stale, isFalse);
      expect(reading.fetchedAt.toUtc(), DateTime.utc(2026, 10, 15, 15));
    });

    test('200 (stale / probabilidad nula) → degradación propagada', () async {
      final mock = MockClient(
        (request) async => http.Response(_body(stale: true, probability: null), 200),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      final reading =
          await service.fetchCurrent(token: 'tok', lat: -33.13, lon: -61.0);

      expect(reading.stale, isTrue);
      expect(reading.precipitationProbabilityMax, isNull);
    });

    test('401 → SyncUnauthorizedException', () async {
      final mock = MockClient(
        (request) async => http.Response(jsonEncode({'message': 'Token'}), 401),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.fetchCurrent(token: 'tok', lat: -33.13, lon: -61.0),
        throwsA(isA<SyncUnauthorizedException>()),
      );
    });

    test('404 → SyncPermanentException', () async {
      final mock = MockClient(
        (request) async => http.Response(jsonEncode({'message': 'No'}), 404),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.fetchCurrent(token: 'tok', lat: 0, lon: 0),
        throwsA(isA<SyncPermanentException>()),
      );
    });

    test('500 → SyncRetriableException', () async {
      final mock = MockClient(
        (request) async => http.Response('{}', 500),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.fetchCurrent(token: 'tok', lat: 0, lon: 0),
        throwsA(isA<SyncRetriableException>()),
      );
    });

    test('SocketException → SyncRetriableException', () async {
      final mock = MockClient(
        (request) async => throw const SocketException('no network'),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.fetchCurrent(token: 'tok', lat: 0, lon: 0),
        throwsA(isA<SyncRetriableException>()),
      );
    });
  });

  group('WeatherApiService.fetchForLot', () {
    test('usa GET /lots/:lotId/weather (lote codificado)', () async {
      final mock = MockClient((request) async {
        expect(request.url.pathSegments, ['lots', 'lot 1', 'weather']);
        expect(request.headers['Authorization'], 'Bearer tok');
        return http.Response(_body(), 200);
      });

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      final reading = await service.fetchForLot(token: 'tok', lotId: 'lot 1');

      expect(reading.windSpeedKnots, 5.3);
    });

    test('503 sin valor previo → SyncRetriableException', () async {
      final mock = MockClient(
        (request) async => http.Response(jsonEncode({'message': 'nope'}), 503),
      );

      final service =
          WeatherApiService(client: mock, baseUrl: 'http://test.api');

      expect(
        () => service.fetchForLot(token: 'tok', lotId: 'lot-1'),
        throwsA(isA<SyncRetriableException>()),
      );
    });
  });
}
