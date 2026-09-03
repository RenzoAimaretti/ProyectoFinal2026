import 'dart:async';

import 'package:flutter/material.dart';
import 'app/auth/login_view.dart';
import 'app/auth/login_view_model.dart';
import 'app/home/home_view.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/drift_photo_repository.dart';
import 'data/repositories/drift_session_repository.dart';
import 'data/repositories/http_auth_repository.dart';
import 'data/repositories/path_provider_photo_storage_repository.dart';
import 'data/services/app_database.dart';
import 'data/services/photo_picker_service.dart';
import 'domain/models/auth_user.dart';
import 'domain/models/session.dart';
import 'domain/usecases/add_photo_usecase.dart';
import 'domain/usecases/delete_photo_usecase.dart';
import 'domain/usecases/login_usecase.dart';
import 'presentation/preview/components_preview_screen.dart';

/// Flag temporal para validación de prototipos (Phase 7). En `false` vuelve al
/// flujo normal de login → home.
const bool kShowDesignSystem = true;

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

  /// Pendientes de sincronización (badge del home).
  late final Stream<int> _pendingSyncCount;

  /// Dependencias de fotos (CUU05/06), cableadas aquí para que los formularios
  /// de Phase 7 las consuman. Públicas porque aún no tienen consumidor y el
  /// linter no marca como no usados los campos públicos.
  late final AddPhotoUseCase addPhotoUseCase;
  late final DeletePhotoUseCase deletePhotoUseCase;
  late final PhotoPickerService photoPickerService;

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

    // Badge "pendientes de sincronización": el stream se construye en data
    // (SyncQueueDao) y se inyecta aquí; el badge solo recibe Stream<int>.
    _pendingSyncCount = _database.syncQueueDao.watchPendingCount();

    // Fotos (CUU05/06): storage físico + persistencia drift + use cases.
    final photoStorage = PathProviderPhotoStorageRepository();
    final photoRepository = DriftPhotoRepository(_database);
    addPhotoUseCase = AddPhotoUseCase(photoRepository, photoStorage);
    deletePhotoUseCase = DeletePhotoUseCase(photoRepository, photoStorage);
    photoPickerService = PhotoPickerService();
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
      home: kShowDesignSystem
          ? const ComponentsPreviewScreen()
          : _authenticatedUser != null
              ? HomeView(
                  user: _authenticatedUser!,
                  pendingSyncCount: _pendingSyncCount,
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
