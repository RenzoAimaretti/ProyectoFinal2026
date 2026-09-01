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
}
