import 'dart:async';

import '../errors.dart';
import '../models/enums.dart';
import '../models/photo.dart';
import '../repositories/photo_repository.dart';
import '../repositories/photo_storage_repository.dart';

/// CUU05/06: adjunta una foto a una entidad.
///
/// Copia el archivo fuente a app-docs (puerto de storage, sin plugins de
/// Flutter en el dominio) y persiste la fila `Photo`. Bloquea la 6.ª foto por
/// entidad (R008). El `id` se asigna en el adaptador drift al insertar; la
/// fila persistida se refleja vía `PhotoRepository.watchByEntity`.
class AddPhotoUseCase {
  AddPhotoUseCase(this._photoRepository, this._storage);

  static const int maxPhotosPerEntity = 5;

  final PhotoRepository _photoRepository;
  final PhotoStorageRepository _storage;

  Future<Photo> execute({
    required PhotoEntityType entityType,
    required String entityId,
    required String sourcePath,
    int orderIndex = 0,
  }) async {
    // R008: máximo 5 fotos por entidad.
    final current = await _photoRepository.countByEntity(entityType, entityId);
    if (current >= maxPhotosPerEntity) {
      throw MaxPhotosExceededException(entityType, entityId);
    }

    final storedPath = await _storage.copyToAppDocs(sourcePath);
    final photo = Photo(
      entityType: entityType,
      entityId: entityId,
      localPath: storedPath,
      orderIndex: orderIndex,
    );
    await _photoRepository.add(photo);
    return photo;
  }
}
