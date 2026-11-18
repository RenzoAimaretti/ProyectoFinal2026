import 'package:drift/drift.dart';

import '../../domain/models/weather_reading.dart';
import '../../domain/repositories/weather_repository.dart';
import '../services/app_database.dart';
import '../services/daos/weather_cache_dao.dart';

/// Cache local de la última lectura meteorológica (spec A12) sobre la tabla
/// `WeatherCache`. Siempre hay a lo sumo una fila (`id = 'current'`).
class DriftWeatherCacheRepository implements WeatherReadingStore {
  DriftWeatherCacheRepository(this._db);

  final AppDatabase _db;

  @override
  Future<WeatherReading?> read() async {
    final row = await _db.weatherCacheDao.get();
    if (row == null) return null;
    return WeatherReading(
      temperatureC: row.temperatureC,
      windSpeedKnots: row.windSpeedKnots,
      windDirectionDeg: row.windDirectionDeg,
      precipitationMm: row.precipitationMm,
      precipitationProbabilityMax: row.precipitationProbabilityMax,
      fetchedAt: row.fetchedAt,
      stale: row.stale,
      resolvedFrom: row.resolvedFrom,
    );
  }

  @override
  Future<void> save(WeatherReading reading) {
    return _db.weatherCacheDao.save(
      WeatherCacheCompanion.insert(
        id: WeatherCacheDao.currentRowId,
        temperatureC: reading.temperatureC,
        windSpeedKnots: reading.windSpeedKnots,
        windDirectionDeg: reading.windDirectionDeg,
        precipitationMm: reading.precipitationMm,
        precipitationProbabilityMax:
            Value(reading.precipitationProbabilityMax),
        resolvedFrom: reading.resolvedFrom,
        stale: Value(reading.stale),
        fetchedAt: reading.fetchedAt,
      ),
    );
  }
}
