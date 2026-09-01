import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/auth/login_view.dart';
import 'package:mobile/app/auth/login_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/usecases/login_usecase.dart';
import 'package:mobile/presentation/components/buttons/primary_button.dart';
import 'package:mobile/presentation/components/inputs/custom_text_field.dart';

/// Fake del caso de uso de login para los tests de widget.
class FakeLoginUseCase implements LoginUseCase {
  bool shouldFail = false;

  @override
  Future<Session> execute({
    required String email,
    required String password,
  }) async {
    if (shouldFail) {
      throw Exception('Credenciales inválidas');
    }
    return Session(
      userId: 'u-1',
      email: email,
      fullName: 'test',
      role: 'ADMIN',
      token: 'token-123',
      companyId: 'eliggi',
      lastAccessedAt: DateTime(2026, 1, 1),
    );
  }
}

Widget createTestableLoginView(LoginViewModel viewModel, {VoidCallback? onSuccess}) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: LoginView(
      viewModel: viewModel,
      onLoginSuccess: onSuccess,
    ),
  );
}

void main() {
  group('LoginView Widget Tests', () {
    late FakeLoginUseCase fakeUseCase;
    late LoginViewModel viewModel;

    setUp(() {
      fakeUseCase = FakeLoginUseCase();
      viewModel = LoginViewModel(loginUseCase: fakeUseCase);
    });

    testWidgets('debería renderizar la vista de login con todos los componentes requeridos', (tester) async {
      await tester.pumpWidget(createTestableLoginView(viewModel));

      expect(find.text('Agrolify'), findsOneWidget);
      expect(find.text('Plataforma de Gestión Agrícola y Ganadera'), findsOneWidget);
      expect(find.text('Correo electrónico'), findsOneWidget);
      expect(find.text('Contraseña'), findsOneWidget);
      expect(find.text('Razón social / Firma'), findsOneWidget);
      expect(find.byType(CustomTextField), findsNWidgets(2));
      expect(find.byType(PrimaryButton), findsOneWidget);
      expect(find.text('Iniciar sesión'), findsOneWidget);
    });

    testWidgets('debería mostrar errores de validación si se presiona el botón con campos vacíos', (tester) async {
      await tester.pumpWidget(createTestableLoginView(viewModel));

      await tester.tap(find.byType(PrimaryButton));
      await tester.pump();

      expect(find.text('El email es requerido'), findsOneWidget);
      expect(find.text('La contraseña es requerida'), findsOneWidget);
    });

    testWidgets('debería permitir ingresar email y contraseña y ejecutar login exitosamente', (tester) async {
      bool loginCallbackCalled = false;
      await tester.pumpWidget(createTestableLoginView(
        viewModel,
        onSuccess: () {
          loginCallbackCalled = true;
        },
      ));

      final textFields = find.byType(TextField);
      await tester.enterText(textFields.first, 'admin@firma.com');
      await tester.enterText(textFields.last, 'Password123!');

      await tester.tap(find.byType(PrimaryButton));
      await tester.pumpAndSettle();

      expect(viewModel.isLoggedIn, isTrue);
      expect(loginCallbackCalled, isTrue);
    });

    testWidgets('debería mostrar banner de error si el servidor retorna excepción', (tester) async {
      fakeUseCase.shouldFail = true;
      await tester.pumpWidget(createTestableLoginView(viewModel));

      final textFields = find.byType(TextField);
      await tester.enterText(textFields.first, 'admin@firma.com');
      await tester.enterText(textFields.last, 'Password123!');

      await tester.tap(find.byType(PrimaryButton));
      await tester.pumpAndSettle();

      expect(find.text('Credenciales inválidas'), findsOneWidget);
    });
  });
}
