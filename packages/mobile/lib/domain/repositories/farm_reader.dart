import 'dart:async';

import '../models/catalogs.dart';

/// Lectura de campos por cliente.
abstract class FarmReader {
  Stream<List<Farm>> watchByClient(String clientId);
}
