import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/daos/weather_cache_dao.dart';

import '../../repositories/drift_test_helper.dart';

/// 11.2 — `WeatherCacheDao`: guardar/leer la última lectura con su `fetchedAt`.
void main() {
  late AppDatabase db;

  setUp(() => db = createTestDatabase());

  tearDown(() => db.close());

  WeatherCacheCompanion makeRow({
    String id = WeatherCacheDao.currentRowId,
    double windSpeedKnots = 5.3,
    bool stale = false,
  }) =>
      WeatherCacheCompanion.insert(
        id: id,
        temperatureC: 18.4,
        windSpeedKnots: windSpeedKnots,
        windDirectionDeg: 156,
        precipitationMm: 0.1,
        precipitationProbabilityMax: const Value(10),
        resolvedFrom: 'lot',
        stale: Value(stale),
        fetchedAt: DateTime(2026, 10, 15, 15),
      );

  test('save + get: round-trip de la lectura vigente', () async {
    expect(await db.weatherCacheDao.get(), isNull);

    await db.weatherCacheDao.save(makeRow());

    final row = await db.weatherCacheDao.get();
    expect(row, isNotNull);
    expect(row!.id, WeatherCacheDao.currentRowId);
    expect(row.temperatureC, 18.4);
    expect(row.windSpeedKnots, 5.3);
    expect(row.windDirectionDeg, 156);
    expect(row.precipitationMm, 0.1);
    expect(row.precipitationProbabilityMax, 10);
    expect(row.resolvedFrom, 'lot');
    expect(row.stale, isFalse);
    expect(row.fetchedAt, DateTime(2026, 10, 15, 15));
  });

  test('save es upsert de la fila vigente (una sola fila)', () async {
    await db.weatherCacheDao.save(makeRow(windSpeedKnots: 5.3));
    await db.weatherCacheDao.save(
      makeRow(windSpeedKnots: 12.5, stale: true),
    );

    final rows = await db.select(db.weatherCache).get();
    expect(rows, hasLength(1));

    final row = await db.weatherCacheDao.get();
    expect(row!.windSpeedKnots, 12.5);
    expect(row.stale, isTrue);
  });
}
