import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../data/services/photo_picker_service.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/daily_report.dart';
import '../../domain/models/enums.dart';
import '../../domain/repositories/input_reader.dart';
import '../../domain/repositories/labor_type_reader.dart';
import '../../domain/repositories/lot_reader.dart';
import '../../domain/usecases/add_photo_usecase.dart';
import '../../domain/usecases/create_daily_report_usecase.dart';

/// ViewModel del formulario de alta de parte diario (CUU05).
///
/// El parte nace de una [Task] (R007): recibe `taskId` y el use case hereda
/// `lotId`/`laborTypeId` de la tarea y valida R009 (receta previa) internamente.
/// La firma (`companyId`) llega por parámetro desde el selector global, por lo
/// que el formulario ya NO expone dropdown de firma ni cascada de selección.
///
/// Solo conserva los insumos (editor), la resolución de nombres de lote/labor
/// para el encabezado de resumen, y el flujo de fotos.
class DailyReportFormViewModel extends ChangeNotifier {
  DailyReportFormViewModel({
    required CreateDailyReportUseCase createUseCase,
    required InputReader inputReader,
    required LotReader lotReader,
    required LaborTypeReader laborTypeReader,
    required AddPhotoUseCase addPhotoUseCase,
    required PhotoPickerService photoPickerService,
  })  : _createUseCase = createUseCase,
        _inputReader = inputReader,
        _lotReader = lotReader,
        _laborTypeReader = laborTypeReader,
        _addPhotoUseCase = addPhotoUseCase,
        _photoPickerService = photoPickerService;

  final CreateDailyReportUseCase _createUseCase;
  final InputReader _inputReader;
  final LotReader _lotReader;
  final LaborTypeReader _laborTypeReader;
  final AddPhotoUseCase _addPhotoUseCase;
  final PhotoPickerService _photoPickerService;

  // ── Catálogos (streams de drift) ────────────────────────────────────────

  Stream<List<Input>> get inputs => _inputReader.watchAll();

  /// Nombre del lote para el encabezado de resumen (cae al id si no resuelve).
  Future<String> lotName(String lotId) async =>
      (await _lotReader.getById(lotId))?.name ?? lotId;

  /// Nombre de la labor para el encabezado de resumen (cae al id si no resuelve).
  Future<String> laborName(String laborTypeId) async =>
      (await _laborTypeReader.getById(laborTypeId))?.name ?? laborTypeId;

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

  /// Crea el parte (delega validaciones a [CreateDailyReportUseCase], que
  /// hereda lote/labor de la tarea y valida R009) y, si hay fotos capturadas,
  /// las asocia al parte recién creado (R008).
  Future<void> create({
    required String operatorId,
    required String companyId,
    required String taskId,
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
        taskId: taskId,
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
