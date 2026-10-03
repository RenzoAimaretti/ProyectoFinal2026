import 'dart:async';

import '../models/enums.dart';
import '../models/photo.dart';

/// Persistencia de fotos (transversal a CUU05/06).
abstract class PhotoRepository {
  Future<void> add(Photo photo);

  Stream<List<Photo>> watchByEntity(PhotoEntityType entityType, String entityId);

  /// Cantidad de fotos asociadas a `(entityType, entityId)` (R008).
  Future<int> countByEntity(PhotoEntityType entityType, String entityId);

  /// Elimina la fila. El borrado físico del archivo lo coordina
  /// `DeletePhotoUseCase` vía el puerto de storage (el adaptador drift solo
  /// toca la DB).
  Future<void> delete(String id);
}
