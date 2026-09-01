import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../domain/models/enums.dart';
import '../../domain/models/photo.dart' as domain;
import '../../domain/repositories/photo_repository.dart';
import '../models/photo_mapper.dart';
import '../services/app_database.dart';
import 'sync_queue_writer.dart';

/// Persistencia de fotos (transversal a CUU05/06) en drift.
class DriftPhotoRepository implements PhotoRepository {
  DriftPhotoRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> add(domain.Photo photo) {
    return _db.transaction(() async {
      final id = photo.id ?? const Uuid().v4();
      await _db.into(_db.photos).insert(photo.fromDomain(id: id));
      await enqueueSync(
        db: _db,
        entity: SyncEntity.photo,
        entityId: id,
      );
    });
  }

  @override
  Stream<List<domain.Photo>> watchByEntity(
    PhotoEntityType entityType,
    String entityId,
  ) {
    return _db.photosDao
        .watchByEntity(entityType.name, entityId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Future<void> delete(String id) {
    return _db.transaction(() async {
      await (_db.delete(_db.photos)..where((t) => t.id.equals(id))).go();
      await enqueueSync(
        db: _db,
        entity: SyncEntity.photo,
        entityId: id,
        operation: SyncOperation.DELETE,
      );
    });
  }
}
