import 'package:flutter/foundation.dart';

import '../../domain/errors.dart';
import '../../domain/models/weather_reading.dart';
import '../../domain/usecases/get_weather_usecase.dart';

/// Ubicación con la que se pide el clima. El lote tiene precedencia (el
/// backend resuelve su centroide y lo scopea por tenant, spec A9).
class WeatherLocation {
  const WeatherLocation({this.lotId, this.lat, this.lon});

  final String? lotId;
  final double? lat;
  final double? lon;
}

/// Estado de la tarjeta de clima y viento (spec A12).
///
/// Cache-first: primero publica la última lectura local (visible sin señal) y
/// después intenta refrescar contra la API propia. Si el refresco falla,
/// conserva la lectura local y expone el motivo. Si nunca hubo lectura, queda
/// en estado vacío — nunca se inventa un valor (spec A8).
class WeatherViewModel extends ChangeNotifier {
  WeatherViewModel(this._getWeatherUseCase, {this.resolveLocation});

  final GetWeatherUseCase _getWeatherUseCase;

  /// Resuelve la ubicación vigente al momento de refrescar. Es opcional: sin
  /// ella la tarjeta solo puede mostrar el cache local.
  final Future<WeatherLocation?> Function()? resolveLocation;

  WeatherReading? _reading;
  bool _loading = false;
  bool _hasLocation = false;
  String? _errorMessage;
  bool _disposed = false;

  WeatherReading? get reading => _reading;
  bool get isLoading => _loading;

  /// `true` cuando se pudo resolver una ubicación para refrescar.
  bool get hasLocation => _hasLocation;

  /// Motivo del último refresco fallido (la lectura local sigue visible).
  String? get errorMessage => _errorMessage;

  /// Lectura local inmediata + refresco remoto best-effort.
  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    _notify();

    try {
      final local = await _getWeatherUseCase.lastReading();
      if (local != null) {
        _reading = local;
        _notify();
      }

      final location = await resolveLocation?.call();
      _hasLocation = location != null;
      if (location == null) return;

      _reading = await _getWeatherUseCase.refresh(
        lat: location.lat,
        lon: location.lon,
        lotId: location.lotId,
      );
      _errorMessage = null;
    } on DomainException catch (error) {
      _errorMessage = error.message;
    } catch (_) {
      _errorMessage = 'No se pudo actualizar el clima';
    } finally {
      _loading = false;
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
