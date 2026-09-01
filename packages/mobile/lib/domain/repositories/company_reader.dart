import 'dart:async';

import '../models/catalogs.dart';

/// Lectura del catálogo de firmas/razones sociales.
abstract class CompanyReader {
  Stream<List<Company>> watchAll();

  Future<Company?> getById(String id);
}
