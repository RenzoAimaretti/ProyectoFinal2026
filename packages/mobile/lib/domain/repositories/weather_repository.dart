import '../models/weather_reading.dart';

/// Puerto del clima (design §2.12 / spec A12).
///
/// Agrupa el lado cache (lectura local inmediata, visible sin señal) y el lado
/// remoto (lectura contra la API propia, que en éxito persiste localmente).
abstract class WeatherRepository {
  /// Última lectura local (sin red) con su timestamp — se muestra sin señal.
  Future<WeatherReading?> lastReading();

  /// Lectura remota; en éxito persiste localmente y devuelve el valor.
  Future<WeatherReading> fetchCurrent({required double lat, required double lon});

  /// Lectura remota por lote (resuelta y scopeada en el backend).
  Future<WeatherReading> fetchForLot({required String lotId});
}

/// Persistencia local de la última lectura (lado cache del puerto).
///
/// Vive separado de [WeatherRepository] porque un adaptador puramente local no
/// puede implementar los métodos remotos.
abstract class WeatherReadingStore {
  Future<WeatherReading?> read();

  Future<void> save(WeatherReading reading);
}
