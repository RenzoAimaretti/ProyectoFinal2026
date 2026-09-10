import 'package:drift/native.dart';
import 'package:mobile/data/services/app_database.dart';

export 'package:drift/drift.dart';
export 'package:drift/native.dart';

/// Crea un [AppDatabase] en memoria para tests de adaptadores drift.
///
/// Usa `NativeDatabase.memory()` que no necesita filesystem.
/// Cada test debe llamar `db.close()` en `tearDown`.
AppDatabase createTestDatabase() {
  return AppDatabase.forTesting(NativeDatabase.memory());
}

