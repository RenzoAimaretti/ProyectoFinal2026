import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/data/services/daos/weather_cache_dao.dart';

import '../repositories/drift_test_helper.dart';

/// 10.7 / §5 — Migración drift 5 → 6: aditiva y no destructiva (tabla nueva).
/// La tabla del clima se renumeró de v4 a v6 al integrar `dev`, que ya usaba
/// v4 (categorías) y v5 (uso de maquinaria).
void main() {
  test('migración 5 → 6 crea la tabla weather_cache', () async {
    final db = createTestDatabase();
    addTearDown(db.close);

    // Simula una base v5: la tabla nueva todavía no existe.
    await db.customStatement('DROP TABLE weather_cache');
    expect(await _hasWeatherCacheTable(db), isFalse);

    await db.migration.onUpgrade(Migrator(db), 5, 6);

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

  test('schemaVersion de la base es 6', () {
    final db = createTestDatabase();
    addTearDown(db.close);

    expect(db.schemaVersion, 6);
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
