import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';
import '../../domain/errors.dart';
import '../../domain/models/field_catalog.dart';
import '../../domain/repositories/field_catalog_source.dart';
import '../models/enum_wire_mapper.dart';

/// Servicio API del catálogo de campo (`GET /catalog/field`).
///
/// La respuesta es una foto autoritativa que la caché local reconcilia, así que
/// una respuesta sin alguna colección se rechaza en lugar de interpretarse como
/// "vacía" (eso borraría datos locales).
class FieldCatalogApiService implements FieldCatalogSource {
  FieldCatalogApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  static const _collections = [
    'companies',
    'clients',
    'farms',
    'lots',
    'laborTypes',
    'machines',
    'tasks',
    'inputCategories',
    'inputs',
    'laborTypeCategories',
    'recipes',
  ];

  @override
  Future<FieldCatalog> fetch({required String token}) async {
    final url = Uri.parse('$_baseUrl/catalog/field');
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
      if (data is! Map<String, dynamic> ||
          _collections.any((key) => data[key] is! List)) {
        throw const SyncPermanentException('Catálogo inválido del servidor');
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

  void _throwOnError(http.Response response) {
    final status = response.statusCode;
    if (status >= 200 && status < 300) return;
    final message = _extractMessage(response);
    if (status == 401) throw SyncUnauthorizedException(message);
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
      // body no JSON.
    }
    return 'Error del servidor (${response.statusCode})';
  }

  FieldCatalog _parse(Map<String, dynamic> json) {
    List<Map<String, dynamic>> list(String key) {
      final value = json[key];
      if (value is! List) return const [];
      return value.whereType<Map<String, dynamic>>().toList();
    }

    double number(Object? value) => (value as num).toDouble();

    return FieldCatalog(
      companies: [
        for (final row in list('companies'))
          (id: row['id'] as String, name: row['name'] as String, cuit: (row['cuit'] as String?) ?? ''),
      ],
      clients: [
        for (final row in list('clients'))
          (id: row['id'] as String, name: row['name'] as String),
      ],
      farms: [
        for (final row in list('farms'))
          (
            id: row['id'] as String,
            clientId: row['clientId'] as String,
            name: row['name'] as String,
            surface: (row['surface'] as num).toDouble(),
          ),
      ],
      lots: [
        for (final row in list('lots'))
          (
            id: row['id'] as String,
            farmId: row['farmId'] as String,
            name: row['name'] as String,
            area: (row['area'] as num).toDouble(),
          ),
      ],
      laborTypes: [
        for (final row in list('laborTypes'))
          (id: row['id'] as String, name: row['name'] as String),
      ],
      machines: [
        for (final row in list('machines'))
          if (machineStatusFromWire(row['status'] as String? ?? '') case final status?)
            (
              id: row['id'] as String,
              companyId: row['companyId'] as String,
              name: row['name'] as String,
              brand: row['brand'] as String?,
              status: status,
            ),
      ],
      tasks: [
        for (final row in list('tasks'))
          if (taskStatusFromWire(row['status'] as String? ?? '') case final status?)
            (
              id: row['id'] as String,
              lotId: row['lotId'] as String,
              laborTypeId: row['laborTypeId'] as String,
              status: status,
              operatorIds: [
                for (final operator in (row['operators'] as List? ?? const []))
                  if (operator is Map && operator['id'] is String)
                    operator['id'] as String,
              ],
            ),
      ],
      inputCategories: [
        for (final row in list('inputCategories'))
          (
            id: row['id'] as String,
            name: row['name'] as String,
            active: (row['active'] as bool?) ?? true,
          ),
      ],
      inputs: [
        for (final row in list('inputs'))
          (
            id: row['id'] as String,
            name: row['name'] as String,
            unit: row['unit'] as String,
            categoryId: row['categoryId'] as String,
            active: (row['active'] as bool?) ?? true,
          ),
      ],
      laborTypeCategories: [
        for (final row in list('laborTypeCategories'))
          (
            laborTypeId: row['laborTypeId'] as String,
            categoryId: row['categoryId'] as String,
          ),
      ],
      recipes: [
        for (final row in list('recipes'))
          (
            id: row['id'] as String,
            lotId: row['lotId'] as String,
            date: DateTime.parse(row['date'] as String),
            observations: row['observations'] as String?,
            items: [
              for (final item in (row['items'] as List? ?? const []))
                if (item is Map<String, dynamic>)
                  (
                    id: item['id'] as String,
                    inputId: item['inputId'] as String,
                    dose: number(item['dose']),
                    unit: item['unit'] as String?,
                    loadOrder: (item['loadOrder'] as num).toInt(),
                  ),
            ],
          ),
      ],
    );
  }
}
