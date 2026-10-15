import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/weather_reading.dart';
import 'package:mobile/domain/repositories/weather_repository.dart';
import 'package:mobile/domain/usecases/get_weather_usecase.dart';

/// 10.3 / 11.3 — `GetWeatherUseCase` cache-first: devuelve lo local al instante
/// y refresca si hay red; sin red queda la última lectura local.
class _FakeWeatherRepository implements WeatherRepository {
  WeatherReading? local;
  WeatherReading? remote;
  Object? remoteError;

  int fetchCurrentCalls = 0;
  int fetchForLotCalls = 0;
  double? lastLat;
  double? lastLon;
  String? lastLotId;

  @override
  Future<WeatherReading?> lastReading() async => local;

  @override
  Future<WeatherReading> fetchCurrent({
    required double lat,
    required double lon,
  }) async {
    fetchCurrentCalls++;
    lastLat = lat;
    lastLon = lon;
    final error = remoteError;
    if (error != null) throw error;
    return remote!;
  }

  @override
  Future<WeatherReading> fetchForLot({required String lotId}) async {
    fetchForLotCalls++;
    lastLotId = lotId;
    final error = remoteError;
    if (error != null) throw error;
    return remote!;
  }
}

WeatherReading _reading({double windSpeedKnots = 5.3, bool stale = false}) =>
    WeatherReading(
      temperatureC: 18.4,
      windSpeedKnots: windSpeedKnots,
      windDirectionDeg: 156,
      precipitationMm: 0.1,
      precipitationProbabilityMax: 10,
      fetchedAt: DateTime(2026, 10, 15, 15),
      stale: stale,
      resolvedFrom: 'lot',
    );

void main() {
  late _FakeWeatherRepository repository;
  late GetWeatherUseCase sut;

  setUp(() {
    repository = _FakeWeatherRepository();
    sut = GetWeatherUseCase(repository);
  });

  test('lastReading delega en el cache local (sin red)', () async {
    repository.local = _reading(windSpeedKnots: 4.0);

    final result = await sut.lastReading();

    expect(result!.windSpeedKnots, 4.0);
    expect(repository.fetchCurrentCalls, 0);
    expect(repository.fetchForLotCalls, 0);
  });

  test('refresh con lotId usa fetchForLot y devuelve lo remoto', () async {
    repository.remote = _reading(windSpeedKnots: 12.5);

    final result = await sut.refresh(lotId: 'lot-9');

    expect(result.windSpeedKnots, 12.5);
    expect(repository.fetchForLotCalls, 1);
    expect(repository.lastLotId, 'lot-9');
    expect(repository.fetchCurrentCalls, 0);
  });

  test('refresh con lat/lon usa fetchCurrent', () async {
    repository.remote = _reading();

    await sut.refresh(lat: -33.13, lon: -61.0);

    expect(repository.fetchCurrentCalls, 1);
    expect(repository.lastLat, -33.13);
    expect(repository.lastLon, -61.0);
    expect(repository.fetchForLotCalls, 0);
  });

  test('refresh sin ubicación → WeatherLocationRequiredException', () {
    expect(
      () => sut.refresh(),
      throwsA(isA<WeatherLocationRequiredException>()),
    );
  });

  test('execute cache-first: sin red devuelve la última lectura local', () async {
    repository.local = _reading(windSpeedKnots: 4.0, stale: true);
    repository.remoteError = const SyncRetriableException('sin señal');

    final result = await sut.execute(lotId: 'lot-1');

    expect(result!.windSpeedKnots, 4.0);
    expect(result.stale, isTrue);
  });

  test('execute con red devuelve la lectura fresca', () async {
    repository.local = _reading(windSpeedKnots: 4.0);
    repository.remote = _reading(windSpeedKnots: 12.5);

    final result = await sut.execute(lat: -33.13, lon: -61.0);

    expect(result!.windSpeedKnots, 12.5);
  });

  test('execute sin local y sin red devuelve null (estado vacío)', () async {
    repository.remoteError = const SyncRetriableException('sin señal');

    final result = await sut.execute(lotId: 'lot-1');

    expect(result, isNull);
  });

  test('execute prioriza el lote sobre las coordenadas', () async {
    repository.remote = _reading();

    await sut.execute(lotId: 'lot-1', lat: -33.13, lon: -61.0);

    expect(repository.fetchForLotCalls, 1);
    expect(repository.fetchCurrentCalls, 0);
  });
}
