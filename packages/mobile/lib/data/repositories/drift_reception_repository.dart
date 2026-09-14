import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../domain/models/reception.dart' as domain;
import '../../domain/models/reception_summary.dart';
import '../../domain/repositories/reception_repository.dart';
import '../models/reception_mapper.dart';
import '../models/reception_summary_mapper.dart';
import '../services/app_database.dart';
import 'sync_queue_writer.dart';

/// Persistencia de recepciones de insumos (CUU06) en drift. Solo lectura en el
/// móvil: la validación y el incremento de stock viven en el backend.
class DriftReceptionRepository implements ReceptionRepository {
  DriftReceptionRepository(this._db);

  final AppDatabase _db;

  @override
  Future<String> create(
    domain.Reception reception,
    List<domain.ReceptionItem> items,
  ) {
    return _db.transaction(() async {
      final id = reception.id ?? const Uuid().v4();
      await _db.into(_db.receptions).insert(reception.fromDomain(id: id));

      for (final item in items) {
        await _db.into(_db.receptionItems).insert(item.fromDomain(id));
      }

      await enqueueSync(
        db: _db,
        entity: SyncEntity.reception,
        entityId: id,
      );
      return id;
    });
  }

  @override
  Stream<List<domain.Reception>> watchAll() {
    return _db.receptionsDao
        .watchAll()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Stream<List<ReceptionSummary>> watchSummaries() {
    return _db.receptionsDao
        .watchSummaries()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }
}
