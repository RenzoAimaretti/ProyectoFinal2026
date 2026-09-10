import 'dart:async';

import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/machine_activity.dart';
import 'package:mobile/domain/models/photo.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/models/session.dart';
import 'package:mobile/domain/models/stock.dart';
import 'package:mobile/domain/repositories/auth_repository.dart';
import 'package:mobile/domain/repositories/daily_report_repository.dart';
import 'package:mobile/domain/repositories/machine_activity_repository.dart';
import 'package:mobile/domain/repositories/photo_repository.dart';
import 'package:mobile/domain/repositories/photo_storage_repository.dart';
import 'package:mobile/domain/repositories/client_reader.dart';
import 'package:mobile/domain/repositories/company_reader.dart';
import 'package:mobile/domain/repositories/farm_reader.dart';
import 'package:mobile/domain/repositories/input_reader.dart';
import 'package:mobile/domain/repositories/labor_type_reader.dart';
import 'package:mobile/domain/repositories/lot_reader.dart';
import 'package:mobile/domain/repositories/machine_reader.dart';
import 'package:mobile/domain/repositories/reception_repository.dart';
import 'package:mobile/domain/repositories/recipe_reader.dart';
import 'package:mobile/data/services/photo_picker_service.dart';
import 'package:mobile/domain/repositories/session_repository.dart';
import 'package:mobile/domain/repositories/stock_repository.dart';

/// Fakes en memoria para tests unitarios de use cases.
///
/// Cada fake implementa el puerto de dominio con almacenamiento in-memory.
/// No usan drift ni Flutter — solo Dart puro.

// ─── Auth ────────────────────────────────────────────────────────────────────

class FakeAuthRepository implements AuthRepository {
  Session? loginResult;
  Exception? loginError;
  bool logoutCalled = false;
  Exception? logoutError;

  @override
  Future<Session> login({required String email, required String password}) {
    if (loginError != null) throw loginError!;
    return Future.value(loginResult!);
  }

  @override
  Future<void> logout() async {
    logoutCalled = true;
    if (logoutError != null) throw logoutError!;
  }
}

// ─── Session ─────────────────────────────────────────────────────────────────

class FakeSessionRepository implements SessionRepository {
  Session? _session;
  bool saveCalled = false;
  bool clearCalled = false;

  @override
  Future<void> save(Session session) async {
    saveCalled = true;
    _session = session;
  }

  @override
  Future<Session?> current() async => _session;

  @override
  Future<void> clear() async {
    clearCalled = true;
    _session = null;
  }
}

// ─── DailyReport ─────────────────────────────────────────────────────────────

class FakeDailyReportRepository implements DailyReportRepository {
  final List<DailyReport> _reports = [];
  final List<List<DailyReportItem>> _items = [];
  int _idCounter = 0;

  @override
  Future<String> create(DailyReport report, List<DailyReportItem> items) async {
    final id = 'dr-${++_idCounter}';
    _reports.add(DailyReport(
      id: id,
      operatorId: report.operatorId,
      companyId: report.companyId,
      lotId: report.lotId,
      laborTypeId: report.laborTypeId,
      date: report.date,
      hectares: report.hectares,
      hours: report.hours,
      status: report.status,
    ));
    _items.add(items);
    return id;
  }

  @override
  Stream<List<DailyReport>> watchPending() {
    return Stream.value(
      _reports
          .where((r) => r.status == DailyReportStatus.PENDING_APPROVAL)
          .toList(),
    );
  }

  @override
  Stream<List<DailyReport>> watchByFilter({
    DailyReportStatus? status,
    DateTime? from,
    DateTime? to,
  }) {
    return Stream.value(_reports.where((r) {
      if (status != null && r.status != status) return false;
      if (from != null && r.date.isBefore(from)) return false;
      if (to != null && r.date.isAfter(to)) return false;
      return true;
    }).toList());
  }

  @override
  Stream<List<DailyReport>> watchByCompany(String companyId) {
    return Stream.value(
      _reports.where((r) => r.companyId == companyId).toList(),
    );
  }

  @override
  Future<void> updateStatus(
    String id,
    DailyReportStatus status, {
    String? rejectionReason,
    String? approvedBy,
  }) async {
    // No-op for unit tests.
  }

  List<DailyReport> get reports => List.unmodifiable(_reports);
}

// ─── Reception ───────────────────────────────────────────────────────────────

class FakeReceptionRepository implements ReceptionRepository {
  final List<Reception> _receptions = [];
  int _idCounter = 0;
  bool validateCalled = false;
  String? lastValidatedId;

  @override
  Future<String> create(Reception reception, List<ReceptionItem> items) async {
    final id = 'rec-${++_idCounter}';
    _receptions.add(Reception(
      id: id,
      clientId: reception.clientId,
      date: reception.date,
      status: reception.status,
    ));
    return id;
  }

  @override
  Stream<List<Reception>> watchPending() {
    return Stream.value(
      _receptions
          .where((r) => r.status == ReceptionStatus.PENDING_VALIDATION)
          .toList(),
    );
  }

  @override
  Future<void> validateAndApplyStock(String id, String validatedBy) async {
    validateCalled = true;
    lastValidatedId = id;
  }
}

// ─── Stock ───────────────────────────────────────────────────────────────────

class FakeStockRepository implements StockRepository {
  final List<Stock> _stocks = [];

  @override
  Future<void> upsertIncrement(
      String clientId, String inputId, double delta) async {
    final idx = _stocks.indexWhere(
        (s) => s.clientId == clientId && s.inputId == inputId);
    if (idx >= 0) {
      final old = _stocks[idx];
      _stocks[idx] = Stock(
        id: old.id,
        clientId: old.clientId,
        inputId: old.inputId,
        quantity: old.quantity + delta,
        updatedAt: DateTime.now(),
      );
    } else {
      _stocks.add(Stock(
        id: 'stock-${_stocks.length + 1}',
        clientId: clientId,
        inputId: inputId,
        quantity: delta,
        updatedAt: DateTime.now(),
      ));
    }
  }

  @override
  Stream<List<Stock>> watchByClient(String clientId) {
    return Stream.value(
        _stocks.where((s) => s.clientId == clientId).toList());
  }

  @override
  Stream<List<Stock>> watchAll() => Stream.value(List.unmodifiable(_stocks));
}

// ─── MachineActivity ─────────────────────────────────────────────────────────

class FakeMachineActivityRepository implements MachineActivityRepository {
  final List<MachineActivity> _activities = [];

  @override
  Future<void> create(MachineActivity activity) async {
    _activities.add(activity);
  }

  @override
  Stream<List<MachineActivity>> watchByMachine(
    String machineId, {
    DateTime? from,
    DateTime? to,
  }) {
    return Stream.value(
      _activities.where((a) => a.machineId == machineId).toList(),
    );
  }

  @override
  Stream<List<MachineActivity>> watchByCompany(String companyId) {
    return Stream.value(
      _activities.where((a) => a.companyId == companyId).toList(),
    );
  }

  @override
  Stream<List<MachineActivity>> watchAll() =>
      Stream.value(List.unmodifiable(_activities));
}

// ─── Photo ───────────────────────────────────────────────────────────────────

class FakePhotoRepository implements PhotoRepository {
  final List<Photo> _photos = [];
  int _idCounter = 0;

  @override
  Future<void> add(Photo photo) async {
    _photos.add(Photo(
      id: 'photo-${++_idCounter}',
      entityType: photo.entityType,
      entityId: photo.entityId,
      localPath: photo.localPath,
      orderIndex: photo.orderIndex,
      createdAt: DateTime.now(),
    ));
  }

  @override
  Stream<List<Photo>> watchByEntity(
      PhotoEntityType entityType, String entityId) {
    return Stream.value(
      _photos
          .where((p) => p.entityType == entityType && p.entityId == entityId)
          .toList(),
    );
  }

  @override
  Future<int> countByEntity(PhotoEntityType entityType, String entityId) async {
    return _photos
        .where((p) => p.entityType == entityType && p.entityId == entityId)
        .length;
  }

  @override
  Future<void> delete(String id) async {
    _photos.removeWhere((p) => p.id == id);
  }
}

// ─── PhotoStorage ────────────────────────────────────────────────────────────

class FakePhotoStorageRepository implements PhotoStorageRepository {
  final List<String> copiedPaths = [];
  final List<String> deletedPaths = [];

  @override
  Future<String> copyToAppDocs(String sourcePath) async {
    final stored = '/fake/app-docs/${sourcePath.split('/').last}';
    copiedPaths.add(stored);
    return stored;
  }

  @override
  Future<void> deleteFile(String storedPath) async {
    deletedPaths.add(storedPath);
  }
}

// ─── RecipeReader ────────────────────────────────────────────────────────────

class FakeRecipeReader implements RecipeReader {
  final List<Recipe> _recipes = [];

  void seedRecipe(Recipe recipe) => _recipes.add(recipe);

  @override
  Stream<List<Recipe>> watchByLot(String lotId) {
    return Stream.value(
        _recipes.where((r) => r.lotId == lotId).toList());
  }

  @override
  Future<Recipe?> getById(String id) async {
    return _recipes.where((r) => r.id == id).firstOrNull;
  }
}

// ─── MachineReader ───────────────────────────────────────────────────────────

class FakeMachineReader implements MachineReader {
  final List<Machine> _machines = [];

  void seed(Machine machine) => _machines.add(machine);

  @override
  Stream<List<Machine>> watchAll() =>
      Stream.value(List.unmodifiable(_machines));

  @override
  Stream<List<Machine>> watchByCompany(String companyId) {
    return Stream.value(
      _machines.where((m) => m.companyId == companyId).toList(),
    );
  }

  @override
  Future<Machine?> getById(String id) async {
    return _machines.where((m) => m.id == id).firstOrNull;
  }
}

// ─── CompanyReader ───────────────────────────────────────────────────────────

class FakeCompanyReader implements CompanyReader {
  final List<Company> _companies = [];

  void seed(Company company) => _companies.add(company);

  @override
  Stream<List<Company>> watchAll() =>
      Stream.value(List.unmodifiable(_companies));

  @override
  Future<Company?> getById(String id) async {
    return _companies.where((c) => c.id == id).firstOrNull;
  }
}

// ─── ClientReader ────────────────────────────────────────────────────────────

class FakeClientReader implements ClientReader {
  final List<Client> _clients = [];

  void seed(Client client) => _clients.add(client);

  @override
  Stream<List<Client>> watchAll() =>
      Stream.value(List.unmodifiable(_clients));

  @override
  Future<Client?> getById(String id) async {
    return _clients.where((c) => c.id == id).firstOrNull;
  }
}

// ─── FarmReader ──────────────────────────────────────────────────────────────

class FakeFarmReader implements FarmReader {
  final List<Farm> _farms = [];

  void seed(Farm farm) => _farms.add(farm);

  @override
  Stream<List<Farm>> watchByClient(String clientId) {
    return Stream.value(
      _farms.where((f) => f.clientId == clientId).toList(),
    );
  }
}

// ─── LotReader ───────────────────────────────────────────────────────────────

class FakeLotReader implements LotReader {
  final List<Lot> _lots = [];

  void seed(Lot lot) => _lots.add(lot);

  @override
  Stream<List<Lot>> watchByFarm(String farmId) {
    return Stream.value(
      _lots.where((l) => l.farmId == farmId).toList(),
    );
  }

  @override
  Future<Lot?> getById(String id) async {
    return _lots.where((l) => l.id == id).firstOrNull;
  }
}

// ─── LaborTypeReader ─────────────────────────────────────────────────────────

class FakeLaborTypeReader implements LaborTypeReader {
  final List<LaborType> _laborTypes = [];

  void seed(LaborType laborType) => _laborTypes.add(laborType);

  @override
  Stream<List<LaborType>> watchAll() =>
      Stream.value(List.unmodifiable(_laborTypes));

  @override
  Future<LaborType?> getById(String id) async {
    return _laborTypes.where((l) => l.id == id).firstOrNull;
  }
}

// ─── InputReader ─────────────────────────────────────────────────────────────

class FakeInputReader implements InputReader {
  final List<Input> _inputs = [];

  void seed(Input input) => _inputs.add(input);

  @override
  Stream<List<Input>> watchAll() =>
      Stream.value(List.unmodifiable(_inputs));

  @override
  Future<Input?> getById(String id) async {
    return _inputs.where((i) => i.id == id).firstOrNull;
  }
}

// ─── PhotoPickerService ──────────────────────────────────────────────────────

class FakePhotoPickerService extends PhotoPickerService {
  String? cameraResult;
  String? galleryResult;

  FakePhotoPickerService() : super(picker: null);

  @override
  Future<String?> pickFromCamera() async => cameraResult;

  @override
  Future<String?> pickFromGallery() async => galleryResult;
}
