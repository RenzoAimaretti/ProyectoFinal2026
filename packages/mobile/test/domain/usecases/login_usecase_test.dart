import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/models/login_response_model.dart';
import 'package:mobile/domain/models/auth_user.dart';
import 'package:mobile/domain/repositories/auth_repository.dart';
import 'package:mobile/domain/usecases/login_usecase.dart';

/// LoginUseCase es una extensión del orquestador más allá del design.md:
/// debe ser thin y behavior-neutral (REQ-F4-03) — delega al puerto
/// [AuthRepository] sin transformar datos ni tragar errores.
void main() {
  group('LoginUseCase (T-F4-02, behavior-neutral)', () {
    test('delega login al AuthRepository con las credenciales recibidas', () async {
      final repo = _MockAuthRepository();
      final useCase = LoginUseCase(authRepository: repo);

      final response = await useCase.login(
        email: 'admin@firma.com',
        password: 'Password123!',
      );

      expect(repo.lastEmail, 'admin@firma.com');
      expect(repo.lastPassword, 'Password123!');
      expect(response.user.email, 'admin@firma.com');
    });

    test('propaga el error del repositorio sin transformarlo', () async {
      final repo = _MockAuthRepository()..shouldThrow = true;
      final useCase = LoginUseCase(authRepository: repo);

      await expectLater(
        useCase.login(email: 'a@b.com', password: 'wrong123'),
        throwsA(
          isA<Exception>()
              .having((e) => e.toString(), 'message', contains('Credenciales inválidas')),
        ),
      );
    });
  });
}

class _MockAuthRepository implements AuthRepository {
  bool shouldThrow = false;
  String? lastEmail;
  String? lastPassword;

  @override
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) async {
    lastEmail = email;
    lastPassword = password;
    if (shouldThrow) {
      throw Exception('Credenciales inválidas');
    }
    return LoginResponseModel(
      accessToken: 'token',
      refreshToken: 'refresh',
      user: AuthUser(
        id: 'u-1',
        email: email,
        role: 'ADMIN',
        firmaId: 'eliggi',
      ),
    );
  }
}
