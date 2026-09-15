import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../data/services/photo_picker_service.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/daily_report.dart';
import '../../domain/models/enums.dart';
import '../../domain/repositories/client_reader.dart';
import '../../domain/repositories/company_reader.dart';
import '../../domain/repositories/farm_reader.dart';
import '../../domain/repositories/input_reader.dart';
import '../../domain/repositories/labor_type_reader.dart';
import '../../domain/repositories/lot_reader.dart';
import '../../domain/repositories/recipe_reader.dart';
import '../../domain/usecases/add_photo_usecase.dart';
import '../../domain/usecases/create_daily_report_usecase.dart';

/// ViewModel del formulario de alta de parte diario (CUU05).
///
/// Recibe use cases + readers por constructor (composition root) y expone los
/// streams de catálogo que alimentan el selector en cascada, los insumos y la
/// firma. La selección de lote habilita la comprobación R009 (receta previa).
///
/// Las fotos se capturan en la grilla (`PhotoPickerGrid`) y se guardan recién
/// al confirmar, una vez conocido el `id` del parte recién creado.
class DailyReportFormViewModel extends ChangeNotifier {
  DailyReportFormViewModel({
    required CreateDailyReportUseCase createUseCase,
    required ClientReader clientReader,
    required FarmReader farmReader,
    required LotReader lotReader,
    required LaborTypeReader laborTypeReader,
    required InputReader inputReader,
    required CompanyReader companyReader,
    required RecipeReader recipeReader,
    required AddPhotoUseCase addPhotoUseCase,
    required PhotoPickerService photoPickerService,
  })  : _createUseCase = createUseCase,
        _clientReader = clientReader,
        _farmReader = farmReader,
        _lotReader = lotReader,
        _laborTypeReader = laborTypeReader,
        _inputReader = inputReader,
        _companyReader = companyReader,
        _recipeReader = recipeReader,
        _addPhotoUseCase = addPhotoUseCase,
        _photoPickerService = photoPickerService;

  final CreateDailyReportUseCase _createUseCase;
  final ClientReader _clientReader;
  final FarmReader _farmReader;
  final LotReader _lotReader;
  final LaborTypeReader _laborTypeReader;
  final InputReader _inputReader;
  final CompanyReader _companyReader;
  final RecipeReader _recipeReader;
  final AddPhotoUseCase _addPhotoUseCase;
  final PhotoPickerService _photoPickerService;

  // ── Catálogos (streams de drift) ────────────────────────────────────────

  Stream<List<Client>> get clients => _clientReader.watchAll();

  Stream<List<Company>> get companies => _companyReader.watchAll();

  Stream<List<LaborType>> get laborTypes => _laborTypeReader.watchAll();

  Stream<List<Input>> get inputs => _inputReader.watchAll();

  Stream<List<Farm>> farmsByClient(String clientId) =>
      _farmReader.watchByClient(clientId);

  Stream<List<Lot>> lotsByFarm(String farmId) => _lotReader.watchByFarm(farmId);

  /// R009: el lote debe tener al menos una receta agronómica para habilitar
  /// la carga del parte.
  Future<bool> lotHasRecipe(String lotId) async {
    final recipes = await _recipeReader.watchByLot(lotId).first;
    return recipes.isNotEmpty;
  }

  // ── Fotos (se persisten al confirmar) ───────────────────────────────────

  final List<String> _pickedPhotoPaths = [];

  /// Rutas de fotos ya capturadas (archivos temporales del picker).
  List<String> get pickedPhotoPaths => List.unmodifiable(_pickedPhotoPaths);

  /// Servicio de captura, expuesto para que `PhotoPickerGrid` lo use sin que
  /// la vista lo instancie.
  PhotoPickerService get photoPickerService => _photoPickerService;

  void setPickedPhotos(List<String> paths) {
    _pickedPhotoPaths
      ..clear()
      ..addAll(paths);
    notifyListeners();
  }

  /// Restablece el estado transitorio (fotos capturadas y flag de guardado)
  /// al abrir una instancia nueva del formulario, para no arrastrar fotos de
  /// un intento previo cancelado.
  void reset() {
    _pickedPhotoPaths.clear();
    _isSaving = false;
    notifyListeners();
  }

  // ── Alta del parte ──────────────────────────────────────────────────────

  bool _isSaving = false;
  bool get isSaving => _isSaving;

  /// Crea el parte (delega validaciones a [CreateDailyReportUseCase]) y, si
  /// hay fotos capturadas, las asocia al parte recién creado (R008).
  Future<void> create({
    required String operatorId,
    required String companyId,
    required String lotId,
    required String laborTypeId,
    required DateTime date,
    required double hectares,
    required double hours,
    required List<DailyReportItem> items,
  }) async {
    _isSaving = true;
    notifyListeners();

    try {
      final reportId = await _createUseCase.execute(
        operatorId: operatorId,
        companyId: companyId,
        lotId: lotId,
        laborTypeId: laborTypeId,
        date: date,
        hectares: hectares,
        hours: hours,
        items: items,
      );

      for (var i = 0; i < _pickedPhotoPaths.length; i++) {
        await _addPhotoUseCase.execute(
          entityType: PhotoEntityType.DAILY_REPORT,
          entityId: reportId,
          sourcePath: _pickedPhotoPaths[i],
          orderIndex: i,
        );
      }

      _pickedPhotoPaths.clear();
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }
}
