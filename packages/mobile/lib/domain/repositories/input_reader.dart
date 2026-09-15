import 'dart:async';

import '../models/catalogs.dart';

/// Lectura del catálogo de insumos.
abstract class InputReader {
  Stream<List<Input>> watchAll();

  Future<Input?> getById(String id);
}
