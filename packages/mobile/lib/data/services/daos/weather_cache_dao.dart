import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/infra_tables.dart';

part 'weather_cache_dao.g.dart';

/// DAO de la última lectura meteorológica (`WeatherCache`, fila única `current`).
///
/// La tarjeta de clima (spec A12) muestra siempre UNA lectura vigente, por eso
/// el guardado es un upsert sobre la clave fija [currentRowId].
@DriftAccessor(tables: [WeatherCache])
class WeatherCacheDao extends DatabaseAccessor<AppDatabase>
    with _$WeatherCacheDaoMixin {
  WeatherCacheDao(AppDatabase db) : super(db);

  /// Clave fija de la fila vigente.
  static const String currentRowId = 'current';

  Future<void> save(WeatherCacheCompanion row) =>
      into(weatherCache).insertOnConflictUpdate(row);

  Future<WeatherCacheRow?> get() =>
      (select(weatherCache)..where((t) => t.id.equals(currentRowId)))
          .getSingleOrNull();
}
