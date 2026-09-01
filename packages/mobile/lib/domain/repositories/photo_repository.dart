import 'dart:async';

import '../models/enums.dart';
import '../models/photo.dart';

/// Persistencia de fotos (transversal a CUU05/06).
abstract class PhotoRepository {
  Future<void> add(Photo photo);

  Stream<List<Photo>> watchByEntity(PhotoEntityType entityType, String entityId);

  /// Elimina la fila y, en el adaptador, el archivo del filesystem.
  Future<void> delete(String id);
}
