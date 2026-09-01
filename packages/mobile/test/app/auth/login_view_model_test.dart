import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/auth/login_view_model.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/usecases/login_usecase.dart';

/// Fake del caso de uso de login: aísla el ViewModel de la persistencia y del
/// HTTP, devolviendo una [Session] de dominio en memoria.
class FakeLoginUseCase implements LoginUseCase {
  bool shouldThrow = false;
  String? lastEmail;
  String? lastPassword;

  @override
  Future<Session> execute({
    required String email,
    required String password,
  }) async {
    lastEmail = email;
    lastPassword = password;
    if (shouldThrow) {
      throw Exception('Usuario o contraseña incorrectos');
    }
    return Session(
      userId: 'u-test',
      email: email,
      fullName: 'admin',
      role: 'ADMIN',
      token: 'test-access-token',
      companyId: 'eliggi',
      lastAccessedAt: DateTime(2026, 1, 1),
    );
  }
}

void main() {
  group('LoginViewModel Unit Tests', () {
    late FakeLoginUseCase fakeUseCase;
    late LoginViewModel viewModel;

    setUp(() {
      fakeUseCase = FakeLoginUseCase();
      viewModel = LoginViewModel(loginUseCase: fakeUseCase);
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

    test('login exitoso debe actualizar isLoggedIn y session', () async {
      viewModel.setEmail('admin@firma.com');
      viewModel.setPassword('Password123!');

      final result = await viewModel.login();

      expect(result, isTrue);
      expect(viewModel.isLoggedIn, isTrue);
      expect(viewModel.session?.email, 'admin@firma.com');
      expect(viewModel.errorMessage, isNull);
      expect(fakeUseCase.lastEmail, 'admin@firma.com');
    });

    test('login fallido debe setear errorMessage', () async {
      fakeUseCase.shouldThrow = true;
      viewModel.setEmail('admin@firma.com');
      viewModel.setPassword('Password123!');

      final result = await viewModel.login();

      expect(result, isFalse);
      expect(viewModel.isLoggedIn, isFalse);
      expect(viewModel.errorMessage, 'Usuario o contraseña incorrectos');
    });
  });
}
