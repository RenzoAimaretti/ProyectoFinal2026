import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/daos/weather_cache_dao.dart';

import '../repositories/drift_test_helper.dart';

/// 10.7 / §5 — Migración drift 3 → 4: aditiva y no destructiva (tabla nueva).
void main() {
  test('migración 3 → 4 crea la tabla weather_cache', () async {
    final db = createTestDatabase();
    addTearDown(db.close);

    // Simula una base v3: la tabla nueva todavía no existe.
    await db.customStatement('DROP TABLE weather_cache');
    expect(await _hasWeatherCacheTable(db), isFalse);

    await db.migration.onUpgrade(Migrator(db), 3, 4);

    expect(await _hasWeatherCacheTable(db), isTrue);

    // La tabla quedó usable por el DAO.
    await db.weatherCacheDao.save(
      WeatherCacheCompanion.insert(
        id: WeatherCacheDao.currentRowId,
        temperatureC: 18.4,
        windSpeedKnots: 5.3,
        windDirectionDeg: 156,
        precipitationMm: 0.1,
        resolvedFrom: 'lot',
        fetchedAt: DateTime(2026, 10, 15, 15),
      ),
    );

    expect((await db.weatherCacheDao.get())!.windSpeedKnots, 5.3);
  });

  test('schemaVersion de la base es 4', () {
    final db = createTestDatabase();
    addTearDown(db.close);

    expect(db.schemaVersion, 4);
  });
}

/// ¿Existe la tabla `weather_cache` en el esquema SQLite?
Future<bool> _hasWeatherCacheTable(AppDatabase db) async {
  final rows = await db
      .customSelect(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='weather_cache'",
      )
      .get();
  return rows.isNotEmpty;
}
