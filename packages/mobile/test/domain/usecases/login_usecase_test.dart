import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/usecases/login_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeAuthRepository authRepository;
  late FakeSessionRepository sessionRepository;
  late LoginUseCase sut;

  setUp(() {
    authRepository = FakeAuthRepository();
    sessionRepository = FakeSessionRepository();
    sut = LoginUseCase(authRepository, sessionRepository);
  });

  final validSession = Session(
    userId: 'u1',
    email: 'test@test.com',
    fullName: 'Test User',
    role: UserRole.operario,
    token: 'jwt-token',
    lastAccessedAt: DateTime(2026, 1, 1),
  );

  test('login exitoso persiste la sesión y la devuelve', () async {
    authRepository.loginResult = validSession;

    final result = await sut.execute(email: 'test@test.com', password: '1234');

    expect(result.email, 'test@test.com');
    expect(sessionRepository.saveCalled, isTrue);
  });

  test('login fallido propaga la excepción, save no se llama', () async {
    authRepository.loginError = Exception('Credenciales inválidas');

    expect(
      () => sut.execute(email: 'bad', password: 'bad'),
      throwsException,
    );
    expect(sessionRepository.saveCalled, isFalse);
  });
}
