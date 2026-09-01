import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

/// Foto genérica (polimórfica, sin FK — D5): (entityType, entityId) apunta a
/// la entidad dueña (DAILY_REPORT | RECEPTION).
@TableIndex(name: 'idx_photos_entity', columns: {#entityType, #entityId})
@DataClassName('Photo')
class Photos extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get localPath => text()();
  IntColumn get orderIndex => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cola outbox de sincronización (sin FK). Row class `SyncQueueEntry` para no
/// chocar con la clase `SyncQueue extends Table`.
@TableIndex(name: 'idx_sync_queue_status_created', columns: {#status, #createdAt})
@DataClassName('SyncQueueEntry')
class SyncQueue extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get entity => text()();
  TextColumn get entityId => text()();
  TextColumn get operation => text()();
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
