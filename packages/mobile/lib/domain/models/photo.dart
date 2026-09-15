import 'enums.dart';

/// Fotografía genérica (polimórfica, sin FK — D5).
///
/// `entityType` + `entityId` apuntan a la entidad dueña (`DAILY_REPORT` |
/// `RECEPTION`); el archivo vive en filesystem y aquí solo se guarda la ruta.
class Photo {
  const Photo({
    this.id,
    required this.entityType,
    required this.entityId,
    required this.localPath,
    this.orderIndex = 0,
    this.createdAt,
  });

  final String? id;
  final PhotoEntityType entityType;
  final String entityId;
  final String localPath;
  final int orderIndex;
  final DateTime? createdAt;
}
