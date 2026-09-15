import 'dart:async';

import 'package:drift/drift.dart';

import '../../domain/models/session.dart' as domain;
import '../../domain/repositories/session_repository.dart';
import '../models/session_mapper.dart';
import '../services/app_database.dart';

/// Persistencia local de la sesión (CUU00) en drift.
class DriftSessionRepository implements SessionRepository {
  DriftSessionRepository(this._db);

  final AppDatabase _db;

  @override
  Future<void> save(domain.Session session) {
    return _db.transaction(() async {
      // Sesión única: cada login reemplaza la anterior.
      await _db.delete(_db.sessions).go();
      await _db.into(_db.sessions).insert(session.fromDomain());
    });
  }

  @override
  Future<domain.Session?> current() async {
    final query = _db.select(_db.sessions)
      ..orderBy([(t) => OrderingTerm.desc(t.lastAccessedAt)])
      ..limit(1);
    final row = await query.getSingleOrNull();
    return row?.toDomain();
  }

  @override
  Future<void> clear() {
    return _db.delete(_db.sessions).go();
  }
}
