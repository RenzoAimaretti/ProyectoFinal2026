import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../../domain/repositories/photo_storage_repository.dart';

/// Almacenamiento físico de fotos en `<app-docs>/photos/` usando
/// `path_provider` + `path`. Implementa [PhotoStorageRepository] (design §6.2).
class PathProviderPhotoStorageRepository implements PhotoStorageRepository {
  @override
  Future<String> copyToAppDocs(String sourcePath) async {
    final docs = await getApplicationDocumentsDirectory();
    final extension = p.extension(sourcePath);
    final fileName = '${const Uuid().v4()}$extension';
    final destPath = p.join(docs.path, 'photos', fileName);

    await Directory(p.dirname(destPath)).create(recursive: true);
    await File(sourcePath).copy(destPath);
    return destPath;
  }

  @override
  Future<void> deleteFile(String storedPath) async {
    final file = File(storedPath);
    if (await file.exists()) {
      await file.delete();
    }
  }
}
