import 'dart:async';

import '../errors.dart';
import '../models/photo.dart';
import '../repositories/photo_repository.dart';
import '../repositories/photo_storage_repository.dart';

/// Elimina una foto: borra la fila (el adaptador encola su `DELETE` en
/// `SyncQueue`) y elimina el archivo físico vía el puerto de storage
/// (design §6.3). El adaptador drift solo toca la DB, por eso el borrado del
/// filesystem se coordina aquí.
class DeletePhotoUseCase {
  DeletePhotoUseCase(this._photoRepository, this._storage);

  final PhotoRepository _photoRepository;
  final PhotoStorageRepository _storage;

  Future<void> execute(Photo photo) async {
    final id = photo.id;
    if (id == null) {
      throw const DomainException('La foto no está persistida');
    }
    await _photoRepository.delete(id);
    await _storage.deleteFile(photo.localPath);
  }
}
