import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/home/weather_view_model.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/weather_reading.dart';
import 'package:mobile/domain/repositories/weather_repository.dart';
import 'package:mobile/domain/usecases/get_weather_usecase.dart';

/// 10.9 — `WeatherViewModel`: lectura local inmediata + refresh.
class _FakeWeatherRepository implements WeatherRepository {
  WeatherReading? local;
  WeatherReading? remote;
  Object? remoteError;
  Completer<WeatherReading>? gate;
  int fetchForLotCalls = 0;

  @override
  Future<WeatherReading?> lastReading() async => local;

  @override
  Future<WeatherReading> fetchCurrent({
    required double lat,
    required double lon,
  }) =>
      _fetch();

  @override
  Future<WeatherReading> fetchForLot({required String lotId}) {
    fetchForLotCalls++;
    return _fetch();
  }

  Future<WeatherReading> _fetch() async {
    final pending = gate;
    if (pending != null) return pending.future;
    final error = remoteError;
    if (error != null) throw error;
    return remote!;
  }
}

WeatherReading _reading({double windSpeedKnots = 12.5, bool stale = false}) =>
    WeatherReading(
      temperatureC: 18.4,
      windSpeedKnots: windSpeedKnots,
      windDirectionDeg: 156,
      precipitationMm: 0.1,
      precipitationProbabilityMax: 10,
      fetchedAt: DateTime(2026, 10, 15, 14, 30),
      stale: stale,
      resolvedFrom: 'lot',
    );

void main() {
  late _FakeWeatherRepository repository;

  setUp(() => repository = _FakeWeatherRepository());

  test('publica la lectura local antes de que termine el refresco', () async {
    repository.local = _reading(windSpeedKnots: 4.0);
    repository.gate = Completer<WeatherReading>();

    final sut = WeatherViewModel(
      GetWeatherUseCase(repository),
      resolveLocation: () async => const WeatherLocation(lotId: 'lot-1'),
    );

    final pending = sut.load();
    await pumpEventQueue();

    expect(sut.reading!.windSpeedKnots, 4.0);
    expect(sut.isLoading, isTrue);

    repository.gate!.complete(_reading(windSpeedKnots: 12.5));
    await pending;

    expect(sut.reading!.windSpeedKnots, 12.5);
    expect(sut.isLoading, isFalse);
  });

  test('sin red conserva la lectura local y expone el motivo', () async {
    repository.local = _reading(windSpeedKnots: 4.0, stale: true);
    repository.remoteError = const SyncRetriableException('sin señal');

    final sut = WeatherViewModel(
      GetWeatherUseCase(repository),
      resolveLocation: () async => const WeatherLocation(lotId: 'lot-1'),
    );

    await sut.load();

    expect(sut.reading!.windSpeedKnots, 4.0);
    expect(sut.reading!.stale, isTrue);
    expect(sut.errorMessage, 'sin señal');
    expect(sut.isLoading, isFalse);
  });

  test('sin ubicación resuelta no llama a la API', () async {
    final sut = WeatherViewModel(
      GetWeatherUseCase(repository),
      resolveLocation: () async => null,
    );

    await sut.load();

    expect(sut.hasLocation, isFalse);
    expect(repository.fetchForLotCalls, 0);
    expect(sut.reading, isNull);
  });
}
