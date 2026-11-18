/// Lectura meteorológica normalizada (spec A12).
///
/// La velocidad del viento está SIEMPRE en nudos (`kn`): es la unidad nativa de
/// Open-Meteo, por eso no se aplica ninguna conversión (R005). `stale` y
/// `fetchedAt` viajan desde el backend para que un valor degradado nunca se
/// presente como fresco (spec A8).
class WeatherReading {
  const WeatherReading({
    required this.temperatureC,
    required this.windSpeedKnots,
    required this.windDirectionDeg,
    required this.precipitationMm,
    this.precipitationProbabilityMax,
    required this.fetchedAt,
    required this.stale,
    required this.resolvedFrom,
  });

  final double temperatureC;

  /// Velocidad del viento en nudos (R005) — sin conversión.
  final double windSpeedKnots;

  /// Dirección del viento en grados (0–360).
  final double windDirectionDeg;

  final double precipitationMm;

  /// Probabilidad máxima de precipitación del día (`daily[0]` del wire); puede
  /// no venir informada.
  final double? precipitationProbabilityMax;

  /// Momento en que el backend resolvió la lectura (ISO 8601 en el wire).
  final DateTime fetchedAt;

  /// `true` cuando el backend degradó a su último valor cacheado (spec A8).
  final bool stale;

  /// Cómo se resolvió la ubicación: `'coordinates' | 'lot' | 'farm'`.
  final String resolvedFrom;
}
