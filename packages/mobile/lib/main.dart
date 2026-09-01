import 'package:flutter/material.dart';
import 'app/auth/login_view.dart';
import 'app/auth/login_view_model.dart';
import 'app/home/home_view.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/drift_session_repository.dart';
import 'data/repositories/http_auth_repository.dart';
import 'data/services/app_database.dart';
import 'domain/models/auth_user.dart';
import 'domain/models/session.dart';
import 'domain/usecases/login_usecase.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final AppDatabase _database;
  late final LoginViewModel _loginViewModel;
  AuthUser? _authenticatedUser;

  @override
  void initState() {
    super.initState();
    // Composition root: AppDatabase singleton → adapters → use cases → VMs.
    // Los widgets NO instancian repositorios ni servicios.
    _database = AppDatabase();
    final authRepository = HttpAuthRepository();
    final sessionRepository = DriftSessionRepository(_database);
    final loginUseCase = LoginUseCase(authRepository, sessionRepository);
    _loginViewModel = LoginViewModel(loginUseCase: loginUseCase);
  }

  @override
  void dispose() {
    _loginViewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agrolify',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _authenticatedUser != null
          ? HomeView(
              user: _authenticatedUser!,
              onLogout: () {
                setState(() {
                  _authenticatedUser = null;
                });
              },
            )
          : LoginView(
              viewModel: _loginViewModel,
              onLoginSuccess: () {
                final session = _loginViewModel.session;
                if (session != null) {
                  setState(() {
                    _authenticatedUser = _toAuthUser(session);
                  });
                }
              },
            ),
    );
  }

  /// Adaptación temporal: `HomeView` todavía consume `AuthUser` (se migra a
  /// `Session` en Phase 7). `Session.companyId` (firma) es opcional en la
  /// sesión, por eso el fallback a string vacío.
  AuthUser _toAuthUser(Session session) {
    return AuthUser(
      id: session.userId,
      email: session.email,
      role: session.role,
      firmaId: session.companyId ?? '',
    );
  }
}
