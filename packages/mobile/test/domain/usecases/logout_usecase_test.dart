import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/usecases/logout_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeAuthRepository authRepository;
  late FakeSessionRepository sessionRepository;
  late LogoutUseCase sut;

  setUp(() {
    authRepository = FakeAuthRepository();
    sessionRepository = FakeSessionRepository();
    sut = LogoutUseCase(authRepository, sessionRepository);
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
}
