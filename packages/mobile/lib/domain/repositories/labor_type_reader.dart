import 'dart:async';

import '../models/catalogs.dart';

/// Lectura del catálogo de labores.
abstract class LaborTypeReader {
  Stream<List<LaborType>> watchAll();

  Future<LaborType?> getById(String id);
}
