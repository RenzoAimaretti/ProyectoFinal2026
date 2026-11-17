import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';
import '../../domain/errors.dart';
import '../../domain/models/enums.dart';
import '../models/enum_wire_mapper.dart';

typedef CatalogCompany = ({String id, String name, String cuit});
typedef CatalogClient = ({String id, String name});
typedef CatalogFarm = ({
  String id,
  String clientId,
  String name,
  double surface,
});
typedef CatalogLot = ({String id, String farmId, String name, double area});
typedef CatalogLaborType = ({String id, String name});
typedef CatalogMachine = ({
  String id,
  String companyId,
  String name,
  String? brand,
  MachineStatus status,
});
typedef CatalogTask = ({
  String id,
  String lotId,
  String laborTypeId,
  TaskStatus status,
  List<String> operatorIds,
});

/// Catálogo de campo que el móvil cachea para operar offline (T14).
///
/// Una sola lectura autenticada (`GET /catalog/field`) trae la firma propia, la
/// taxonomía del tenant, las máquinas de la firma y las tareas con sus
/// operarios asignados.
class FieldCatalog {
  const FieldCatalog({
    required this.companies,
    required this.clients,
    required this.farms,
    required this.lots,
    required this.laborTypes,
    required this.machines,
    required this.tasks,
  });

  final List<CatalogCompany> companies;
  final List<CatalogClient> clients;
  final List<CatalogFarm> farms;
  final List<CatalogLot> lots;
  final List<CatalogLaborType> laborTypes;
  final List<CatalogMachine> machines;
  final List<CatalogTask> tasks;

  bool get isEmpty => tasks.isEmpty && machines.isEmpty;

  int get rowCount =>
      companies.length +
      clients.length +
      farms.length +
      lots.length +
      laborTypes.length +
      machines.length +
      tasks.length;
}

/// Servicio API del catálogo de campo.
class FieldCatalogApiService {
  FieldCatalogApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

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
      if (data is! Map<String, dynamic>) {
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
    );
  }
}
