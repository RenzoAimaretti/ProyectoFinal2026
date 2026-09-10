import 'package:flutter/foundation.dart';

import '../../data/services/photo_picker_service.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/reception.dart';
import '../../domain/repositories/client_reader.dart';
import '../../domain/repositories/input_reader.dart';
import '../../domain/usecases/add_photo_usecase.dart';
import '../../domain/usecases/create_reception_usecase.dart';

/// ViewModel del formulario de alta de recepción de insumos (CUU06).
///
/// Recibe use cases + readers por constructor (composition root) y expone los
/// streams de catálogo (clientes e insumos) que alimentan el selector y el
/// editor de ítems. Las fotos se capturan en la grilla (`PhotoPickerGrid`) y se
/// guardan recién al confirmar, una vez conocido el `id` de la recepción recién
/// creada.
class ReceptionFormViewModel extends ChangeNotifier {
  ReceptionFormViewModel({
    required CreateReceptionUseCase createUseCase,
    required ClientReader clientReader,
    required InputReader inputReader,
    required AddPhotoUseCase addPhotoUseCase,
    required PhotoPickerService photoPickerService,
  })  : _createUseCase = createUseCase,
        _clientReader = clientReader,
        _inputReader = inputReader,
        _addPhotoUseCase = addPhotoUseCase,
        _photoPickerService = photoPickerService;

  final CreateReceptionUseCase _createUseCase;
  final ClientReader _clientReader;
  final InputReader _inputReader;
  final AddPhotoUseCase _addPhotoUseCase;
  final PhotoPickerService _photoPickerService;

  // ── Catálogos (streams de drift) ────────────────────────────────────────

  Stream<List<Client>> get clients => _clientReader.watchAll();

  Stream<List<Input>> get inputs => _inputReader.watchAll();

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

  // ── Alta de la recepción ────────────────────────────────────────────────

  bool _isSaving = false;
  bool get isSaving => _isSaving;

  /// Crea la recepción (delega validaciones a [CreateReceptionUseCase]) y, si
  /// hay fotos capturadas, las asocia a la recepción recién creada (R008).
  Future<void> create({
    required String clientId,
    required DateTime date,
    required List<ReceptionItem> items,
  }) async {
    _isSaving = true;
    notifyListeners();

    try {
      final receptionId = await _createUseCase.execute(
        clientId: clientId,
        date: date,
        items: items,
      );

      for (var i = 0; i < _pickedPhotoPaths.length; i++) {
        await _addPhotoUseCase.execute(
          entityType: PhotoEntityType.RECEPTION,
          entityId: receptionId,
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
