import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/auth/login_view_model.dart';
import 'package:mobile/data/models/login_response_model.dart';
import 'package:mobile/data/repositories/auth_repository.dart';
import 'package:mobile/domain/models/auth_user.dart';

class MockAuthRepository implements AuthRepository {
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
      throw Exception('Usuario o contraseña incorrectos');
    }
    return const LoginResponseModel(
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: AuthUser(
        id: 'u-test',
        email: 'admin@firma.com',
        role: 'ADMIN',
        firmaId: 'eliggi',
      ),
    );
  }
}

void main() {
  group('LoginViewModel Unit Tests', () {
    late MockAuthRepository mockRepo;
    late LoginViewModel viewModel;

    setUp(() {
      mockRepo = MockAuthRepository();
      viewModel = LoginViewModel(authRepository: mockRepo);
    });

    test('estado inicial del ViewModel debe ser correcto', () {
      expect(viewModel.email, isEmpty);
      expect(viewModel.password, isEmpty);
      expect(viewModel.selectedFirmaId, 'eliggi');
      expect(viewModel.isLoading, isFalse);
      expect(viewModel.obscurePassword, isTrue);
      expect(viewModel.errorMessage, isNull);
      expect(viewModel.isLoggedIn, isFalse);
    });

    test('setEmail y setPassword deben actualizar los campos', () {
      viewModel.setEmail('test@empresa.com');
      viewModel.setPassword('Password123!');

      expect(viewModel.email, 'test@empresa.com');
      expect(viewModel.password, 'Password123!');
    });

    test('setSelectedFirmaId debe actualizar la firma seleccionada', () {
      viewModel.setSelectedFirmaId('eliggi_tufoni');
      expect(viewModel.selectedFirmaId, 'eliggi_tufoni');
    });

    test('toggleObscurePassword debe alternar la visibilidad', () {
      expect(viewModel.obscurePassword, isTrue);
      viewModel.toggleObscurePassword();
      expect(viewModel.obscurePassword, isFalse);
    });

    test('validateInputs debe marcar errores si email o contraseña están vacíos', () {
      final isValid = viewModel.validateInputs();

      expect(isValid, isFalse);
      expect(viewModel.emailError, 'El email es requerido');
      expect(viewModel.passwordError, 'La contraseña es requerida');
    });

    test('login exitoso debe actualizar isLoggedIn y loggedUser', () async {
      viewModel.setEmail('admin@firma.com');
      viewModel.setPassword('Password123!');

      final result = await viewModel.login();

      expect(result, isTrue);
      expect(viewModel.isLoggedIn, isTrue);
      expect(viewModel.loggedUser?.email, 'admin@firma.com');
      expect(viewModel.errorMessage, isNull);
      expect(mockRepo.lastEmail, 'admin@firma.com');
    });

    test('login fallido debe setear errorMessage', () async {
      mockRepo.shouldThrow = true;
      viewModel.setEmail('admin@firma.com');
      viewModel.setPassword('Password123!');

      final result = await viewModel.login();

      expect(result, isFalse);
      expect(viewModel.isLoggedIn, isFalse);
      expect(viewModel.errorMessage, 'Usuario o contraseña incorrectos');
    });
  });
}
