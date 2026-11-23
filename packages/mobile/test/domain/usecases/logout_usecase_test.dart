import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/usecases/logout_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeAuthRepository authRepository;
  late FakeSessionRepository sessionRepository;
  late FakeLocalDataRepository localData;
  late LogoutUseCase sut;

  setUp(() {
    authRepository = FakeAuthRepository();
    sessionRepository = FakeSessionRepository();
    localData = FakeLocalDataRepository();
    sut = LogoutUseCase(authRepository, sessionRepository, localData);
  });

  test('logout revoca token remoto y limpia sesión local', () async {
    await sut.execute();

    expect(authRepository.logoutCalled, isTrue);
    expect(sessionRepository.clearCalled, isTrue);
  });

  test('logout sin red: falla la revocación pero clear se ejecuta', () async {
    authRepository.logoutError = Exception('Sin red');

    await sut.execute();

    expect(authRepository.logoutCalled, isTrue);
    expect(sessionRepository.clearCalled, isTrue);
  });

  test('logout pasa el refreshToken persistido al adaptador', () async {
    await sessionRepository.save(Session(
      userId: 'u-1',
      email: 'test@test.com',
      fullName: 'Test User',
      role: UserRole.operario,
      token: 'tok',
      refreshToken: 'ref-token',
      lastAccessedAt: DateTime(2026, 1, 1),
    ));

    await sut.execute();

    expect(authRepository.logoutRefreshToken, 'ref-token');
    expect(sessionRepository.clearCalled, isTrue);
  });

  test('sin pendientes limpia también los datos locales del usuario', () async {
    await sut.execute();

    expect(localData.clearAllCalled, isTrue);
    expect(sessionRepository.clearCalled, isTrue);
  });

  test('con pendientes y sin confirmar descarte: avisa cuántos hay y no toca nada', () async {
    localData.pending = 3;

    await expectLater(
      sut.execute(),
      throwsA(isA<PendingSyncOnLogoutException>()
          .having((e) => e.pendingCount, 'pendingCount', 3)),
    );
    expect(authRepository.logoutCalled, isFalse);
    expect(localData.clearAllCalled, isFalse);
    expect(sessionRepository.clearCalled, isFalse);
  });

  test('con pendientes y descarte confirmado: borra pendientes y catálogo y cierra sesión', () async {
    localData.pending = 3;

    await sut.execute(discardPending: true);

    expect(authRepository.logoutCalled, isTrue);
    expect(localData.clearAllCalled, isTrue);
    expect(sessionRepository.clearCalled, isTrue);
  });
}
