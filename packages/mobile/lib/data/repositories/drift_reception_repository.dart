import 'dart:async';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/errors.dart';
import '../../domain/models/enums.dart';
import '../../domain/models/reception.dart' as domain;
import '../../domain/repositories/reception_repository.dart';
import '../models/enum_converters.dart';
import '../models/reception_mapper.dart';
import '../services/app_database.dart';
import 'stock_upsert.dart';
import 'sync_queue_writer.dart';

/// Persistencia de recepciones de insumos (CUU06) en drift.
class DriftReceptionRepository implements ReceptionRepository {
  DriftReceptionRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> create(
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
    });
  }

  @override
  Stream<List<domain.Reception>> watchPending() {
    return _db.receptionsDao
        .watchPending()
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }

  @override
  Future<void> validateAndApplyStock(String id, String validatedBy) {
    return _db.transaction(() async {
      final reception = await (_db.select(_db.receptions)
            ..where((t) => t.id.equals(id)))
          .getSingleOrNull();
      if (reception == null) {
        throw const DomainException('Recepción no encontrada');
      }

      final items = await (_db.select(_db.receptionItems)
            ..where((t) => t.receptionId.equals(id)))
          .get();

      final now = DateTime.now();
      await (_db.update(_db.receptions)..where((t) => t.id.equals(id))).write(
            ReceptionsCompanion(
              status: Value(receptionStatusToText(ReceptionStatus.VALIDATED)),
              validatedBy: Value(validatedBy),
              validatedAt: Value(now),
              updatedAt: Value(now),
            ),
          );

      // R017: el stock se materializa en la MISMA transacción de la validación.
      for (final item in items) {
        await upsertStockIncrement(
          _db,
          reception.clientId,
          item.inputId,
          item.quantity,
        );
      }

      // La validación es una actualización de la recepción; el backend
      // reconstruye el payload con los ítems embebidos y deriva el stock.
      await enqueueSync(
        db: _db,
        entity: SyncEntity.reception,
        entityId: id,
        operation: SyncOperation.UPDATE,
      );
    });
  }
}
