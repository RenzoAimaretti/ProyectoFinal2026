import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';
import '../../domain/errors.dart';
import '../../domain/models/weather_reading.dart';

/// Servicio API del clima (design §2.8/§2.12, spec A12).
///
/// Clasifica la respuesta HTTP igual que [DailyReportApiService]: 401 →
/// [SyncUnauthorizedException], otro 4xx → [SyncPermanentException],
/// 5xx/red → [SyncRetriableException].
class WeatherApiService {
  WeatherApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  /// GET /weather/current?lat=&lon=
  Future<WeatherReading> fetchCurrent({
    required String token,
    required double lat,
    required double lon,
  }) {
    final url = Uri.parse('$_baseUrl/weather/current').replace(
      queryParameters: {'lat': lat.toString(), 'lon': lon.toString()},
    );
    return _get(url, token);
  }

  /// GET /lots/:lotId/weather — la ubicación la resuelve el backend.
  Future<WeatherReading> fetchForLot({
    required String token,
    required String lotId,
  }) {
    final url =
        Uri.parse('$_baseUrl/lots/${Uri.encodeComponent(lotId)}/weather');
    return _get(url, token);
  }

  Future<WeatherReading> _get(Uri url, String token) async {
    try {
      final response = await _client.get(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
        },
      );
      _throwOnError(response);
      final data = jsonDecode(response.body);
      if (data is! Map<String, dynamic>) {
        throw const SyncRetriableException('Respuesta de clima inválida');
      }
      return _parse(data);
    } on DomainException {
      rethrow;
    } catch (_) {
      throw const SyncRetriableException(
        'No se pudo conectar con el servidor. Verifique su conexión.',
      );
    }
  }

  /// Lanza la excepción de sync correspondiente si la respuesta no es 2xx.
  void _throwOnError(http.Response response) {
    final status = response.statusCode;
    if (status >= 200 && status < 300) return;

    final message = _extractMessage(response);
    if (status == 401) {
      throw SyncUnauthorizedException(message);
    }
    if (status >= 400 && status < 500) {
      throw SyncPermanentException(message);
    }
    throw SyncRetriableException(message);
  }

  String _extractMessage(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map && data['message'] != null) {
        return data['message'].toString();
      }
    } catch (_) {
      // body no JSON: usar un mensaje genérico.
    }
    return 'Error del servidor (${response.statusCode})';
  }

  WeatherReading _parse(Map<String, dynamic> json) {
    final current = json['current'];
    final location = json['location'];
    final currentMap = current is Map<String, dynamic> ? current : const {};
    final locationMap = location is Map<String, dynamic> ? location : const {};

    return WeatherReading(
      temperatureC: _requiredDouble(currentMap['temperatureC'], 'temperatureC'),
      windSpeedKnots: _requiredDouble(currentMap['windSpeedKnots'], 'windSpeedKnots'),
      windDirectionDeg:
          _requiredDouble(currentMap['windDirectionDeg'], 'windDirectionDeg'),
      precipitationMm: _requiredDouble(currentMap['precipitationMm'], 'precipitationMm'),
      precipitationProbabilityMax: _dailyProbabilityMax(json['daily']),
      fetchedAt: DateTime.parse(json['fetchedAt'] as String),
      stale: json['stale'] == true,
      resolvedFrom: locationMap['resolvedFrom']?.toString() ?? 'coordinates',
    );
  }

  /// Probabilidad máxima de precipitación del día (`daily[0]`).
  double? _dailyProbabilityMax(Object? daily) {
    if (daily is! List || daily.isEmpty) return null;
    final first = daily.first;
    if (first is! Map<String, dynamic>) return null;
    final value = first['precipitationProbabilityMax'];
    return value is num ? value.toDouble() : null;
  }

  /// Un campo numérico faltante es una ruptura de contrato: falla fuerte en
  /// lugar de inventar un cero silencioso.
  double _requiredDouble(Object? value, String field) {
    if (value is num) return value.toDouble();
    throw SyncRetriableException('Respuesta de clima inválida (falta $field)');
  }
}
