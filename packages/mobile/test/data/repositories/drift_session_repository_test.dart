import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_session_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftSessionRepository sut;

  setUp(() {
    db = createTestDatabase();
    sut = DriftSessionRepository(db);
  });

  tearDown(() => db.close());

  final session = Session(
    userId: 'u-1',
    email: 'test@test.com',
    fullName: 'Test User',
    role: UserRole.operario,
    token: 'jwt-token',
    lastAccessedAt: DateTime(2026, 1, 1),
  );

  test('save + current: round-trip OK', () async {
    await sut.save(session);

    final stored = await sut.current();
    expect(stored, isNotNull);
    expect(stored!.email, 'test@test.com');
    expect(stored.fullName, 'Test User');
    expect(stored.token, 'jwt-token');
  });

  test('save reemplaza la sesión anterior (sesión única)', () async {
    await sut.save(session);

    final newSession = Session(
      userId: 'u-2',
      email: 'new@test.com',
      fullName: 'New User',
      role: UserRole.admin,
      token: 'jwt-new',
      lastAccessedAt: DateTime(2026, 2, 1),
    );
    await sut.save(newSession);

    final stored = await sut.current();
    expect(stored!.email, 'new@test.com');
  });

  test('clear → current devuelve null', () async {
    await sut.save(session);
    await sut.clear();

    final stored = await sut.current();
    expect(stored, isNull);
  });

  test('current sin sesión devuelve null', () async {
    final stored = await sut.current();
    expect(stored, isNull);
  });
}
