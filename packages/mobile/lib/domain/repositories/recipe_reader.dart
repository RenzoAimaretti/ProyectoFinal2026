import 'dart:async';

import '../models/catalogs.dart';

/// Lectura de recetas agronómicas por lote (R009 + precarga de ítems).
abstract class RecipeReader {
  Stream<List<Recipe>> watchByLot(String lotId);

  Future<Recipe?> getById(String id);
}
