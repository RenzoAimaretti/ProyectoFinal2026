import 'dart:async';

import '../../domain/models/enums.dart';
import '../../domain/models/stock.dart' as domain;
import '../../domain/repositories/stock_repository.dart';
import '../models/stock_mapper.dart';
import '../services/app_database.dart';
import 'stock_upsert.dart';
import 'sync_queue_writer.dart';

/// Persistencia de stock global por cliente (CUU06) en drift.
class DriftStockRepository implements StockRepository {
  DriftStockRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> upsertIncrement(String clientId, String inputId, double delta) {
    return _db.transaction(() async {
      await upsertStockIncrement(_db, clientId, inputId, delta);
      await enqueueSync(
        db: _db,
        entity: SyncEntity.stock,
        // Clave natural del Stock (UNIQUE(clientId, inputId)); estable aunque
        // la fila sea nueva (id generado) o existente.
        entityId: '$clientId:$inputId',
        operation: SyncOperation.UPDATE,
      );
    });
  }

  @override
  Stream<List<domain.Stock>> watchByClient(String clientId) {
    return _db.stocksDao
        .watchByClient(clientId)
        .map((rows) => rows.map((r) => r.toDomain()).toList());
  }
}
