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
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/drift_catalog_readers.dart';
import 'data/repositories/drift_daily_report_repository.dart';
import 'data/repositories/drift_machine_activity_repository.dart';
import 'data/repositories/drift_photo_repository.dart';
import 'data/repositories/drift_reception_repository.dart';
import 'data/repositories/drift_session_repository.dart';
import 'data/repositories/drift_stock_repository.dart';
import 'data/repositories/http_auth_repository.dart';
import 'data/repositories/path_provider_photo_storage_repository.dart';
import 'data/services/app_database.dart';
import 'data/services/catalog_seeder.dart';
import 'data/services/photo_picker_service.dart';
import 'domain/models/catalogs.dart' as domain;
import 'domain/models/session.dart';
import 'domain/models/stock.dart' as domain;
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
import 'domain/usecases/restore_session_usecase.dart';
import 'domain/usecases/validate_reception_usecase.dart';
import 'domain/usecases/watch_stock_usecase.dart';
import 'presentation/preview/components_preview_screen.dart';

/// Flag para validación de prototipos (showroom). En `false` (default) muestra
/// el flujo real: login / demo → dashboard. En `true` muestra el showroom de
/// componentes.
const bool kShowDesignSystem = false;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key, this.database});

  final AppDatabase? database;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final AppDatabase _database;
  late final DriftSessionRepository _sessionRepository;
  late final LoginViewModel _loginViewModel;
  late final LogoutUseCase _logoutUseCase;
  late final DailyReportsViewModel _dailyReportsViewModel;
  late final DailyReportFormViewModel _dailyReportFormViewModel;
  late final ReceptionsViewModel _receptionsViewModel;
  late final ReceptionFormViewModel _receptionFormViewModel;
  late final MachineActivitiesViewModel _machineActivitiesViewModel;
  late final MachineActivityFormViewModel _machineActivityFormViewModel;
  late final RestoreSessionUseCase _restoreSessionUseCase;

  /// Pendientes de sincronización (badge del dashboard).
  late final Stream<int> _pendingSyncCount;

  /// Razones sociales reales (catálogo) para el selector global de firma.
  late final Stream<List<domain.Company>> _companies;

  /// Stock global (KPI del dashboard), independiente del cliente/firma.
  late final Stream<List<domain.Stock>> _stock;

  /// Dependencias de fotos (CUU05/06), cableadas aquí para que los formularios
  /// de Phase 7 las consuman. Públicas porque aún no tienen consumidor y el
  /// linter no marca como no usados los campos públicos.
  late final AddPhotoUseCase addPhotoUseCase;
  late final DeletePhotoUseCase deletePhotoUseCase;
  late final PhotoPickerService photoPickerService;

  Session? _session;

  /// true mientras se resuelve la restauración de sesión al arranque (CUU00).
  bool _restoringSession = true;

  @override
  void initState() {
    super.initState();
    // Composition root: AppDatabase singleton → adapters → use cases → VMs.
    // Los widgets NO instancian repositorios ni servicios.
    _database = widget.database ?? AppDatabase();
    final authRepository = HttpAuthRepository();
    final sessionRepository = DriftSessionRepository(_database);
    _sessionRepository = sessionRepository;

    final loginUseCase = LoginUseCase(authRepository, sessionRepository);
    final demoLoginUseCase = DemoLoginUseCase(sessionRepository);
    _logoutUseCase = LogoutUseCase(authRepository, sessionRepository);
    _loginViewModel = LoginViewModel(
      loginUseCase: loginUseCase,
      demoLoginUseCase: demoLoginUseCase,
    );

    // Restauración de sesión (CUU00): si hay sesión local arranca directo en el
    // dashboard; si no, en login. Corre en background para no bloquear el UI.
    _restoreSessionUseCase = RestoreSessionUseCase(sessionRepository);
    unawaited(_restoreSession());

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

    // Selector global de firma (post-login): stream de razones sociales reales.
    _companies = companyReader.watchAll();

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

    // Stock (CUU06): KPI global del dashboard vía WatchStockUseCase.watchAll().
    final stockRepository = DriftStockRepository(_database);
    final watchStockUseCase = WatchStockUseCase(stockRepository);
    _stock = watchStockUseCase.watchAll();

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

  /// Restaura la sesión local al arranque (CUU00). Al resolver desactiva
  /// `_restoringSession` para que `build` pase de la pantalla de carga a
  /// login (sin sesión) o al dashboard (con sesión).
  Future<void> _restoreSession() async {
    final session = await _restoreSessionUseCase.execute();
    if (mounted) {
      setState(() {
        _session = session;
        _restoringSession = false;
      });
    }
  }

  @override
  void dispose() {
    _loginViewModel.dispose();
    _dailyReportsViewModel.dispose();
    _machineActivitiesViewModel.dispose();
    _dailyReportFormViewModel.dispose();
    _receptionFormViewModel.dispose();
    _machineActivityFormViewModel.dispose();
    if (widget.database == null) {
      _database.close();
    }
    super.dispose();
  }

  /// Cambio de firma global (post-login): persiste `Session.companyId` y
  /// refresca las listas que se filtran por firma (partes + maquinaria).
  void _handleFirmChanged(String companyId) {
    final session = _session;
    if (session == null || session.companyId == companyId) return;
    final updated = session.copyWith(companyId: companyId);
    _dailyReportsViewModel.setCompany(companyId);
    _machineActivitiesViewModel.setCompany(companyId);
    setState(() => _session = updated);
    // Persistencia local best-effort: no bloquea la UI.
    unawaited(_sessionRepository.save(updated));
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
          : _restoringSession
              ? const _SessionLoadingView()
              : _session != null
                  ? DashboardView(
                      session: _session!,
                      companies: _companies,
                      stock: _stock,
                      onFirmChanged: _handleFirmChanged,
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

/// Pantalla de arranque mientras se restaura la sesión local (CUU00). Evita el
/// "flash" del login antes de saber si hay sesión persistida.
class _SessionLoadingView extends StatelessWidget {
  const _SessionLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.surface,
      body: Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      ),
    );
  }
}
