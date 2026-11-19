import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/field_catalog.dart';
import 'package:mobile/domain/models/session.dart';
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
  late RefreshFieldCatalogUseCase useCase;

  setUp(() {
    sessions = FakeSessionRepository();
    source = FakeFieldCatalogSource((_) async => _catalog);
    store = FakeFieldCatalogStore();
    useCase = RefreshFieldCatalogUseCase(
      source: source,
      store: store,
      sessionRepository: sessions,
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
}
