import 'package:drift/drift.dart' show Value;

import '../../domain/models/photo.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Fila drift `Photo` → modelo de dominio `Photo`.
extension PhotoRowMapper on Photo {
  domain.Photo toDomain() => domain.Photo(
        id: id,
        entityType: photoEntityTypeFromText(entityType),
        entityId: entityId,
        localPath: localPath,
        orderIndex: orderIndex,
        createdAt: createdAt,
      );
}

/// Modelo de dominio `Photo` → companion drift para insertar.
extension PhotoDomainMapper on domain.Photo {
  PhotosCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return PhotosCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      entityType: photoEntityTypeToText(entityType),
      entityId: entityId,
      localPath: localPath,
      orderIndex: Value.absentIfNull(orderIndex),
      createdAt: Value.absentIfNull(createdAt),
    );
  }
}
