import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/infra_tables.dart';

part 'photos_dao.g.dart';

@DriftAccessor(tables: [Photos])
class PhotosDao extends DatabaseAccessor<AppDatabase> with _$PhotosDaoMixin {
  PhotosDao(AppDatabase db) : super(db);

  Stream<List<Photo>> watchByEntity(String entityType, String entityId) {
    return (select(photos)
          ..where(
            (t) => t.entityType.equals(entityType) & t.entityId.equals(entityId),
          )
          ..orderBy([(t) => OrderingTerm.asc(t.orderIndex)]))
        .watch();
  }

  /// Cantidad de fotos de `(entityType, entityId)` (R008, máx 5).
  Future<int> countByEntity(String entityType, String entityId) {
    final countExp = photos.id.count();
    final query = selectOnly(photos)
      ..addColumns([countExp])
      ..where(photos.entityType.equals(entityType) &
          photos.entityId.equals(entityId));
    return query.map((row) => row.read(countExp) ?? 0).getSingle();
  }
}
