import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';
import '../../domain/errors.dart';
import '../../domain/models/enums.dart';
import '../models/enum_wire_mapper.dart';

/// Respuesta wire de un parte diario (GET de reconciliación, spec B2).
///
/// Solo los campos necesarios para reconciliar; `status` ya mapeado ES→EN
/// (`null` si el backend envía un valor que el móvil no modela).
class DailyReportWire {
  const DailyReportWire({
    required this.id,
    required this.taskId,
    required this.date,
    required this.hectares,
    required this.hours,
    required this.status,
  });

  final String id;
  final String taskId;
  final DateTime date;
  final double hectares;
  final double hours;
  final DailyReportStatus? status;
}

/// Servicio API de partes diarios. Clasifica la respuesta HTTP en las
/// excepciones de sync del dominio: 401 → [SyncUnauthorizedException],
/// 4xx → [SyncPermanentException], 5xx/red → [SyncRetriableException].
class DailyReportApiService {
  DailyReportApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  /// POST /daily-reports — push idempotente por `id` cliente.
  Future<void> create({
    required String token,
    required Map<String, dynamic> payload,
  }) async {
    final url = Uri.parse('$_baseUrl/daily-reports');
    try {
      final response = await _client.post(
        url,
        headers: _headers(token),
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

  /// GET /daily-reports — reconciliación (spec B2).
  Future<List<DailyReportWire>> fetchAll({required String token}) async {
    final url = Uri.parse('$_baseUrl/daily-reports');
    try {
      final response = await _client.get(url, headers: _headers(token));
      _throwOnError(response);
      final data = jsonDecode(response.body);
      if (data is! List) return const [];
      return data
          .whereType<Map<String, dynamic>>()
          .map(_parseWire)
          .toList();
    } on DomainException {
      rethrow;
    } catch (_) {
      throw const SyncRetriableException(
        'No se pudo conectar con el servidor. Verifique su conexión.',
      );
    }
  }

  /// GET /daily-reports/:id — reconciliación puntual (spec B2).
  Future<DailyReportWire?> fetchById({
    required String token,
    required String id,
  }) async {
    final url = Uri.parse('$_baseUrl/daily-reports/$id');
    try {
      final response = await _client.get(url, headers: _headers(token));
      _throwOnError(response);
      final data = jsonDecode(response.body);
      if (data is! Map<String, dynamic>) return null;
      return _parseWire(data);
    } on DomainException {
      rethrow;
    } catch (_) {
      throw const SyncRetriableException(
        'No se pudo conectar con el servidor. Verifique su conexión.',
      );
    }
  }

  Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer $token',
      };

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

  DailyReportWire _parseWire(Map<String, dynamic> json) {
    return DailyReportWire(
      id: json['id'] as String,
      taskId: json['taskId'] as String,
      date: DateTime.parse(json['date'] as String),
      hectares: (json['hectares'] as num).toDouble(),
      hours: (json['hours'] as num).toDouble(),
      status: json['status'] is String
          ? dailyReportStatusFromWire(json['status'] as String)
          : null,
    );
  }
}
