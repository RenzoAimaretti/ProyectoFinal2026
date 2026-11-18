import '../errors.dart';
import '../models/weather_reading.dart';
import '../repositories/weather_repository.dart';

/// No hay ubicación (ni lote ni coordenadas) para consultar el clima.
class WeatherLocationRequiredException extends DomainException {
  const WeatherLocationRequiredException()
      : super('No hay una ubicación disponible para consultar el clima');
}

/// CUU clima (spec A12): cache-first — devuelve lo local al instante y refresca
/// si hay red.
class GetWeatherUseCase {
  GetWeatherUseCase(this._repository);

  final WeatherRepository _repository;

  /// Última lectura local (sin red).
  Future<WeatherReading?> lastReading() => _repository.lastReading();

  /// Lectura remota. El lote tiene precedencia: el backend resuelve su
  /// centroide y lo scopea por tenant (spec A9).
  Future<WeatherReading> refresh({double? lat, double? lon, String? lotId}) {
    if (lotId != null && lotId.isNotEmpty) {
      return _repository.fetchForLot(lotId: lotId);
    }
    if (lat == null || lon == null) {
      throw const WeatherLocationRequiredException();
    }
    return _repository.fetchCurrent(lat: lat, lon: lon);
  }

  /// Cache-first: publica lo local al instante y refresca si hay red. Si el
  /// refresco falla (sin señal), queda la última lectura local; si nunca hubo
  /// lectura, devuelve `null` (estado vacío, nunca un valor inventado).
  Future<WeatherReading?> execute({double? lat, double? lon, String? lotId}) async {
    final local = await _repository.lastReading();
    try {
      return await refresh(lat: lat, lon: lon, lotId: lotId);
    } on DomainException {
      return local;
    }
  }
}
