import 'dart:async';

/// Almacenamiento físico de los archivos de foto (design §6.2).
///
/// El dominio NO conoce `path_provider` ni `image_picker`; este puerto abstrae
/// el copiado y borrado de archivos para que `AddPhotoUseCase` y
/// `DeletePhotoUseCase` no importen plugins de Flutter.
abstract class PhotoStorageRepository {
  /// Copia el archivo en `sourcePath` al directorio de fotos de app-docs y
  /// devuelve la ruta persistida.
  Future<String> copyToAppDocs(String sourcePath);

  /// Elimina el archivo previamente persistido en `storedPath`.
  Future<void> deleteFile(String storedPath);
}
