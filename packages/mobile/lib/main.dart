import 'dart:async';

import 'package:flutter/material.dart';

import 'app/auth/login_view.dart';
import 'app/auth/login_view_model.dart';
import 'app/home/dashboard_view.dart';
import 'app/machinery/machine_activities_view_model.dart';
import 'app/machinery/machine_activity_form_view_model.dart';
import 'app/receptions/reception_form_view_model.dart';
import 'app/receptions/receptions_view_model.dart';
import 'app/reports/daily_report_form_view_model.dart';
import 'app/reports/daily_reports_view_model.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/drift_catalog_readers.dart';
import 'data/repositories/drift_daily_report_repository.dart';
import 'data/repositories/drift_machine_activity_repository.dart';
import 'data/repositories/drift_photo_repository.dart';
import 'data/repositories/drift_reception_repository.dart';
import 'data/repositories/drift_session_repository.dart';
import 'data/repositories/http_auth_repository.dart';
import 'data/repositories/path_provider_photo_storage_repository.dart';
import 'data/services/app_database.dart';
import 'data/services/catalog_seeder.dart';
import 'data/services/photo_picker_service.dart';
import 'domain/models/session.dart';
import 'domain/usecases/add_photo_usecase.dart';
import 'domain/usecases/create_daily_report_usecase.dart';
import 'domain/usecases/create_reception_usecase.dart';
import 'domain/usecases/delete_photo_usecase.dart';
import 'domain/usecases/demo_login_usecase.dart';
import 'domain/usecases/list_daily_reports_usecase.dart';
import 'domain/usecases/list_machine_activities_usecase.dart';
import 'domain/usecases/list_pending_receptions_usecase.dart';
import 'domain/usecases/login_usecase.dart';
import 'domain/usecases/logout_usecase.dart';
import 'domain/usecases/register_machine_activity_usecase.dart';
import 'domain/usecases/validate_reception_usecase.dart';
import 'presentation/preview/components_preview_screen.dart';

/// Flag para validación de prototipos (showroom). En `false` (default) muestra
/// el flujo real: login / demo → dashboard. En `true` muestra el showroom de
/// componentes.
const bool kShowDesignSystem = false;

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
  late final LogoutUseCase _logoutUseCase;
  late final DailyReportsViewModel _dailyReportsViewModel;
  late final DailyReportFormViewModel _dailyReportFormViewModel;
  late final ReceptionsViewModel _receptionsViewModel;
  late final ReceptionFormViewModel _receptionFormViewModel;
  late final MachineActivitiesViewModel _machineActivitiesViewModel;
  late final MachineActivityFormViewModel _machineActivityFormViewModel;

  /// Pendientes de sincronización (badge del dashboard).
  late final Stream<int> _pendingSyncCount;

  /// Dependencias de fotos (CUU05/06), cableadas aquí para que los formularios
  /// de Phase 7 las consuman. Públicas porque aún no tienen consumidor y el
  /// linter no marca como no usados los campos públicos.
  late final AddPhotoUseCase addPhotoUseCase;
  late final DeletePhotoUseCase deletePhotoUseCase;
  late final PhotoPickerService photoPickerService;

  Session? _session;

  @override
  void initState() {
    super.initState();
    // Composition root: AppDatabase singleton → adapters → use cases → VMs.
    // Los widgets NO instancian repositorios ni servicios.
    _database = AppDatabase();
    final authRepository = HttpAuthRepository();
    final sessionRepository = DriftSessionRepository(_database);

    final loginUseCase = LoginUseCase(authRepository, sessionRepository);
    final demoLoginUseCase = DemoLoginUseCase(sessionRepository);
    _logoutUseCase = LogoutUseCase(authRepository, sessionRepository);
    _loginViewModel = LoginViewModel(
      loginUseCase: loginUseCase,
      demoLoginUseCase: demoLoginUseCase,
    );

    // Seed de catálogos de desarrollo (idempotente, best-effort).
    unawaited(_seedCatalogs());

    // Badge "pendientes de sincronización": el stream se construye en data
    // (SyncQueueDao) y se inyecta aquí; el badge solo recibe Stream<int>.
    _pendingSyncCount = _database.syncQueueDao.watchPendingCount();

    // Fotos (CUU05/06): storage físico + persistencia drift + use cases.
    final photoStorage = PathProviderPhotoStorageRepository();
    final photoRepository = DriftPhotoRepository(_database);
    addPhotoUseCase = AddPhotoUseCase(photoRepository, photoStorage);
    deletePhotoUseCase = DeletePhotoUseCase(photoRepository, photoStorage);
    photoPickerService = PhotoPickerService();

    // Catálogos (readers drift) para los selectores de CUU05/06/08.
    final companyReader = DriftCompanyReader(_database);
    final clientReader = DriftClientReader(_database);
    final farmReader = DriftFarmReader(_database);
    final lotReader = DriftLotReader(_database);
    final laborTypeReader = DriftLaborTypeReader(_database);
    final inputReader = DriftInputReader(_database);
    final recipeReader = DriftRecipeReader(_database);
    final machineReader = DriftMachineReader(_database);

    // Parte diario (CUU05): repositorio + use cases + ViewModels.
    final dailyReportRepository = DriftDailyReportRepository(_database);
    final listDailyReportsUseCase = ListDailyReportsUseCase(dailyReportRepository);
    final createDailyReportUseCase =
        CreateDailyReportUseCase(dailyReportRepository, recipeReader);

    _dailyReportsViewModel = DailyReportsViewModel(listDailyReportsUseCase);
    _dailyReportFormViewModel = DailyReportFormViewModel(
      createUseCase: createDailyReportUseCase,
      clientReader: clientReader,
      farmReader: farmReader,
      lotReader: lotReader,
      laborTypeReader: laborTypeReader,
      inputReader: inputReader,
      companyReader: companyReader,
      recipeReader: recipeReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPickerService,
    );

    // Recepción de insumos (CUU06): repositorio + use cases + ViewModels.
    final receptionRepository = DriftReceptionRepository(_database);
    final listPendingReceptionsUseCase =
        ListPendingReceptionsUseCase(receptionRepository);
    final validateReceptionUseCase =
        ValidateReceptionUseCase(receptionRepository);
    final createReceptionUseCase =
        CreateReceptionUseCase(receptionRepository);

    _receptionsViewModel = ReceptionsViewModel(
      listPendingReceptionsUseCase,
      validateReceptionUseCase,
    );
    _receptionFormViewModel = ReceptionFormViewModel(
      createUseCase: createReceptionUseCase,
      clientReader: clientReader,
      inputReader: inputReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPickerService,
    );

    // Actividades de maquinaria (CUU08): repositorio + use cases + ViewModels.
    final machineActivityRepository =
        DriftMachineActivityRepository(_database);
    final listMachineActivitiesUseCase =
        ListMachineActivitiesUseCase(machineActivityRepository);
    final registerMachineActivityUseCase =
        RegisterMachineActivityUseCase(machineActivityRepository);

    _machineActivitiesViewModel =
        MachineActivitiesViewModel(listMachineActivitiesUseCase);
    _machineActivityFormViewModel = MachineActivityFormViewModel(
      registerUseCase: registerMachineActivityUseCase,
      machineReader: machineReader,
      companyReader: companyReader,
    );
  }

  /// Siembra las tablas de catálogo vacías. Corre en background y se traga el
  /// error: el seed no debe impedir el arranque de la app.
  Future<void> _seedCatalogs() async {
    try {
      await CatalogSeeder.seedIfEmpty(_database);
    } catch (e) {
      debugPrint('Seed de catálogos falló: $e');
    }
  }

  @override
  void dispose() {
    _loginViewModel.dispose();
    _dailyReportFormViewModel.dispose();
    _receptionFormViewModel.dispose();
    _machineActivityFormViewModel.dispose();
    super.dispose();
  }

  /// Logout: revocación remota best-effort + limpieza de la sesión local.
  Future<void> _handleLogout() async {
    await _logoutUseCase.execute();
    if (mounted) {
      setState(() => _session = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agrolify',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: kShowDesignSystem
          ? const ComponentsPreviewScreen()
          : _session != null
              ? DashboardView(
                  session: _session!,
                  pendingSyncCount: _pendingSyncCount,
                  onLogout: _handleLogout,
                  dailyReportsViewModel: _dailyReportsViewModel,
                  dailyReportFormViewModel: _dailyReportFormViewModel,
                  receptionsViewModel: _receptionsViewModel,
                  receptionFormViewModel: _receptionFormViewModel,
                  machineActivitiesViewModel: _machineActivitiesViewModel,
                  machineActivityFormViewModel: _machineActivityFormViewModel,
                )
              : LoginView(
                  viewModel: _loginViewModel,
                  onLoginSuccess: () {
                    final session = _loginViewModel.session;
                    if (session != null) {
                      setState(() => _session = session);
                    }
                  },
                ),
    );
  }
}
