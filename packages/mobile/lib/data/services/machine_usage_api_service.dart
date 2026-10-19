import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';
import '../../domain/errors.dart';

/// Servicio API del uso de maquinaria por tarea (CUU08, R021).
///
/// Clasifica la respuesta HTTP en las excepciones de sync del dominio:
/// 401 → [SyncUnauthorizedException], 4xx (incluido 409 por un reintento con
/// datos distintos) → [SyncPermanentException], 5xx/red →
/// [SyncRetriableException].
class MachineUsageApiService {
  MachineUsageApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  /// POST /machine-usages — alta idempotente por `id` cliente.
  Future<void> create({
    required String token,
    required Map<String, dynamic> payload,
  }) async {
    final url = Uri.parse('$_baseUrl/machine-usages');
    try {
      final response = await _client.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      );
      _throwOnError(response);
    } on DomainException {
      rethrow;
    } catch (_) {
      throw const SyncRetriableException(
        'No se pudo conectar con el servidor. Verifique su conexión.',
      );
    }
  }

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
}
