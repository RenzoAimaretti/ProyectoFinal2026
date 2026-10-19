import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/services/field_catalog_api_service.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';

void main() {
  test('parsea el catálogo de campo y traduce estados ES→EN', () async {
    final mock = MockClient((request) async {
      expect(request.url.path, '/catalog/field');
      expect(request.headers['Authorization'], 'Bearer tok');
      return http.Response(
        jsonEncode({
          'companies': [
            {'id': 'company-1', 'name': 'Eliggi', 'cuit': '30-1-1'},
          ],
          'clients': [
            {'id': 'client-1', 'name': 'Cliente'},
          ],
          'farms': [
            {'id': 'farm-1', 'clientId': 'client-1', 'name': 'Campo', 'surface': 100.0},
          ],
          'lots': [
            {'id': 'lot-1', 'farmId': 'farm-1', 'name': 'Lote 1', 'area': 50.0},
          ],
          'laborTypes': [
            {'id': 'labor-1', 'name': 'Siembra'},
          ],
          'machines': [
            {'id': 'machine-1', 'companyId': 'company-1', 'name': 'Tractor', 'brand': null, 'status': 'ACTIVA'},
            {'id': 'machine-2', 'companyId': 'company-1', 'name': 'Sembradora', 'brand': 'JD', 'status': 'MANTENIMIENTO'},
            {'id': 'machine-3', 'companyId': 'company-1', 'name': 'Vieja', 'brand': null, 'status': 'DESCONOCIDO'},
          ],
          'tasks': [
            {
              'id': 'task-1',
              'lotId': 'lot-1',
              'laborTypeId': 'labor-1',
              'status': 'EN_PROGRESO',
              'operators': [{'id': 'op-1'}],
            },
          ],
        }),
        200,
      );
    });

    final service = FieldCatalogApiService(client: mock, baseUrl: 'http://test.api');
    final catalog = await service.fetch(token: 'tok');

    expect(catalog.companies.single.name, 'Eliggi');
    expect(catalog.lots.single.name, 'Lote 1');
    expect(catalog.machines, hasLength(2));
    expect(catalog.machines.first.status, MachineStatus.ACTIVE);
    expect(catalog.machines.last.status, MachineStatus.MAINTENANCE);
    expect(catalog.tasks.single.status, TaskStatus.IN_PROGRESS);
    expect(catalog.tasks.single.operatorIds, ['op-1']);
  });

  test('401 → SyncUnauthorizedException', () async {
    final mock = MockClient((request) async =>
        http.Response(jsonEncode({'message': 'Token inválido'}), 401));
    final service = FieldCatalogApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.fetch(token: 'tok'),
      throwsA(isA<SyncUnauthorizedException>()),
    );
  });

  test('500 → SyncRetriableException', () async {
    final mock = MockClient((request) async => http.Response('{}', 500));
    final service = FieldCatalogApiService(client: mock, baseUrl: 'http://test.api');

    await expectLater(
      service.fetch(token: 'tok'),
      throwsA(isA<SyncRetriableException>()),
    );
  });
}
