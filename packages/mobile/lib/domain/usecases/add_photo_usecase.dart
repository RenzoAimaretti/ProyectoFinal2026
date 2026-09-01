import 'dart:async';

import '../models/photo.dart';
import '../repositories/photo_repository.dart';

/// CUU05/06: adjunta una foto a una entidad. El copiado del archivo a app-docs
/// y la persistencia de la fila los resuelve el adaptador (D9).
class AddPhotoUseCase {
  AddPhotoUseCase(this._photoRepository);

  final PhotoRepository _photoRepository;

  Future<void> execute(Photo photo) => _photoRepository.add(photo);
}
