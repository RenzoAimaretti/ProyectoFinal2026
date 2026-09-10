import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/usecases/restore_session_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeSessionRepository sessionRepository;
  late RestoreSessionUseCase sut;

  setUp(() {
    sessionRepository = FakeSessionRepository();
    sut = RestoreSessionUseCase(sessionRepository);
  });

  test('devuelve la sesión existente', () async {
    final session = Session(
      userId: 'u1',
      email: 'a@b.com',
      fullName: 'A B',
      role: UserRole.operario,
      token: 't',
      lastAccessedAt: DateTime(2026, 1, 1),
    );
    await sessionRepository.save(session);

    final result = await sut.execute();

    expect(result, isNotNull);
    expect(result!.email, 'a@b.com');
  });

  test('devuelve null si no hay sesión', () async {
    final result = await sut.execute();

    expect(result, isNull);
  });
}
