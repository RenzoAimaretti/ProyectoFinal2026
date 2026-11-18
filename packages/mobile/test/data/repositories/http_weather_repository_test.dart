import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/repositories/http_weather_repository.dart';
import 'package:mobile/data/services/weather_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/models/weather_reading.dart';
import 'package:mobile/domain/repositories/session_repository.dart';
import 'package:mobile/domain/repositories/weather_repository.dart';

/// 10.8 — `HttpWeatherRepository`: token desde la sesión + persistencia local.
class _FakeSessionRepository implements SessionRepository {
  Session? session;

  @override
  Future<void> save(Session session) async => this.session = session;

  @override
  Future<Session?> current() async => session;

  @override
  Future<void> clear() async => session = null;
}

class _FakeStore implements WeatherReadingStore {
  WeatherReading? stored;
  int saves = 0;

  @override
  Future<WeatherReading?> read() async => stored;

  @override
  Future<void> save(WeatherReading reading) async {
    stored = reading;
    saves++;
  }
}

String _body() => jsonEncode({
      'location': {'resolvedFrom': 'lot'},
      'current': {
        'temperatureC': 18.4,
        'windSpeedKnots': 12.5,
        'windDirectionDeg': 156,
        'precipitationMm': 0.1,
      },
      'daily': const [],
      'stale': false,
      'fetchedAt': '2026-10-15T15:00:00.000Z',
    });

void main() {
  late _FakeSessionRepository sessions;
  late _FakeStore store;

  setUp(() {
    sessions = _FakeSessionRepository();
    store = _FakeStore();
  });

  HttpWeatherRepository makeRepository(MockClient client) =>
      HttpWeatherRepository(
        apiService: WeatherApiService(client: client, baseUrl: 'http://t.api'),
        cache: store,
        sessionRepository: sessions,
      );

  test('fetchForLot persiste la lectura en el cache local', () async {
    sessions.session = Session(
      userId: 'u-1',
      email: 'o@a.com',
      fullName: 'Op',
      role: 'operario',
      token: 'tok',
      lastAccessedAt: DateTime(2026, 1, 1),
    );

    final repository = makeRepository(
      MockClient((request) async => http.Response(_body(), 200)),
    );

    final reading = await repository.fetchForLot(lotId: 'lot-1');

    expect(reading.windSpeedKnots, 12.5);
    expect(store.saves, 1);
    expect(store.stored!.windSpeedKnots, 12.5);
  });

  test('lastReading lee del cache local sin llamar a la API', () async {
    store.stored = WeatherReading(
      temperatureC: 1,
      windSpeedKnots: 2,
      windDirectionDeg: 3,
      precipitationMm: 4,
      fetchedAt: DateTime(2026, 1, 1),
      stale: true,
      resolvedFrom: 'lot',
    );

    final repository = makeRepository(
      MockClient((request) async => fail('no debe llamar a la API')),
    );

    final reading = await repository.lastReading();

    expect(reading!.windSpeedKnots, 2);
  });

  test('sin sesión activa → SyncUnauthorizedException', () async {
    final repository = makeRepository(
      MockClient((request) async => http.Response(_body(), 200)),
    );

    expect(
      () => repository.fetchForLot(lotId: 'lot-1'),
      throwsA(isA<SyncUnauthorizedException>()),
    );
  });
}
