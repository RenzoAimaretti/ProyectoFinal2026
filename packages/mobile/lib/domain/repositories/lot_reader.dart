import 'dart:async';

import '../models/catalogs.dart';

/// Lectura de lotes por campo.
abstract class LotReader {
  Stream<List<Lot>> watchByFarm(String farmId);

  Future<Lot?> getById(String id);
}
