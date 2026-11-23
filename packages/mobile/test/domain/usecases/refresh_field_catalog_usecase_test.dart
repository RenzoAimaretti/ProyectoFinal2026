import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/field_catalog.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/repositories/access_token_refresher.dart';
import 'package:mobile/domain/repositories/field_catalog_source.dart';
import 'package:mobile/domain/repositories/field_catalog_store.dart';
import 'package:mobile/domain/usecases/refresh_field_catalog_usecase.dart';

import 'fakes.dart';

class FakeFieldCatalogSource implements FieldCatalogSource {
  FakeFieldCatalogSource(this.respond);

  Future<FieldCatalog> Function(String token) respond;
  final List<String> tokens = [];

  @override
  Future<FieldCatalog> fetch({required String token}) {
    tokens.add(token);
    return respond(token);
  }
}

class FakeFieldCatalogStore implements FieldCatalogStore {
  final List<FieldCatalog> saved = [];

  @override
  Future<void> replaceWith(FieldCatalog catalog) async => saved.add(catalog);
}

class FakeAccessTokenRefresher implements AccessTokenRefresher {
  FakeAccessTokenRefresher(this.respond);

  Future<String> Function() respond;
  int calls = 0;

  @override
  Future<String> refreshAccessToken() {
    calls++;
    return respond();
  }
}

const _catalog = FieldCatalog(
  companies: [],
  clients: [],
  farms: [],
  lots: [],
  laborTypes: [],
  machines: [],
  tasks: [],
  inputs: [(id: 'input-1', name: 'Glifosato', unit: 'L', categoryId: 'cat-1', active: true)],
);

Session _session({String token = 'tok'}) => Session(
      userId: 'u1',
      email: 'a@b.com',
      fullName: 'A B',
      role: UserRole.operario,
      token: token,
      refreshToken: 'refresh',
      lastAccessedAt: DateTime(2026, 1, 1),
    );

void main() {
  late FakeSessionRepository sessions;
  late FakeFieldCatalogSource source;
  late FakeFieldCatalogStore store;
  late FakeAccessTokenRefresher refresher;
  late RefreshFieldCatalogUseCase useCase;

  setUp(() {
    sessions = FakeSessionRepository();
    source = FakeFieldCatalogSource((_) async => _catalog);
    store = FakeFieldCatalogStore();
    refresher = FakeAccessTokenRefresher(() async => 'new-tok');
    useCase = RefreshFieldCatalogUseCase(
      source: source,
      store: store,
      sessionRepository: sessions,
      tokenRefresher: refresher,
    );
  });

  test('sin sesión con token (demo o logout) no consulta ni escribe y devuelve 0', () async {
    await sessions.save(_session(token: ''));

    expect(await useCase.execute(), 0);
    expect(source.tokens, isEmpty);
    expect(store.saved, isEmpty);
  });

  test('con token descarga la foto y la aplica como autoritativa', () async {
    await sessions.save(_session());

    expect(await useCase.execute(), _catalog.rowCount);
    expect(source.tokens, ['tok']);
    expect(store.saved, [same(_catalog)]);
  });

  test('un error de red se propaga y no toca la caché', () async {
    await sessions.save(_session());
    source.respond = (_) async => throw const SyncRetriableException('sin red');

    await expectLater(useCase.execute(), throwsA(isA<SyncRetriableException>()));
    expect(store.saved, isEmpty);
  });

  test('ante 401 renueva el token una vez y reintenta con el nuevo', () async {
    await sessions.save(_session());
    source.respond = (token) async => token == 'tok'
        ? throw const SyncUnauthorizedException('expirado')
        : _catalog;

    expect(await useCase.execute(), _catalog.rowCount);
    expect(source.tokens, ['tok', 'new-tok']);
    expect(refresher.calls, 1);
    expect(store.saved, [same(_catalog)]);
  });

  test('si el token renovado también es rechazado, propaga el 401 sin reintentar más', () async {
    await sessions.save(_session());
    source.respond = (_) async => throw const SyncUnauthorizedException('expirado');

    await expectLater(useCase.execute(), throwsA(isA<SyncUnauthorizedException>()));
    expect(source.tokens, ['tok', 'new-tok']);
    expect(refresher.calls, 1);
    expect(store.saved, isEmpty);
  });

  test('si el refresh falla, propaga ese error y no toca la caché', () async {
    await sessions.save(_session());
    source.respond = (_) async => throw const SyncUnauthorizedException('expirado');
    refresher.respond = () async => throw const SyncPermanentException('Sesión expirada');

    await expectLater(useCase.execute(), throwsA(isA<SyncPermanentException>()));
    expect(source.tokens, ['tok']);
    expect(store.saved, isEmpty);
  });
}
