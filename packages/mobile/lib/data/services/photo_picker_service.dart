import 'package:image_picker/image_picker.dart';

/// Helper delgado sobre `image_picker` para capturar fotos (cámara/galería).
///
/// Devuelve la ruta del archivo temporal (o `null` si el usuario cancela) para
/// que `AddPhotoUseCase` la copie a app-docs. Los formularios CUU05/06
/// (Phase 7) consumen este servicio.
class PhotoPickerService {
  PhotoPickerService({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  Future<String?> pickFromCamera() async {
    final file = await _picker.pickImage(source: ImageSource.camera);
    return file?.path;
  }

  Future<String?> pickFromGallery() async {
    final file = await _picker.pickImage(source: ImageSource.gallery);
    return file?.path;
  }
}
