import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/models/login_response_model.dart';
import 'package:mobile/domain/models/auth_user.dart';
import 'package:mobile/domain/repositories/auth_repository.dart';

/// Contrato REQ-F4-02: el puerto [AuthRepository] vive en
/// domain/repositories con la firma de login congelada
/// (login({required email, required password})).
void main() {
  group('AuthRepository domain port (REQ-F4-02)', () {
    test('hostea la interfaz AuthRepository con login(email, password) requeridos', () async {
      final AuthRepository repo = _MinimalAuthRepository();

      final LoginResponseModel response = await repo.login(
        email: 'admin@firma.com',
        password: 'Password123!',
      );

      expect(response.user.email, 'admin@firma.com');
    });
  });
}

class _MinimalAuthRepository implements AuthRepository {
  @override
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) async {
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
