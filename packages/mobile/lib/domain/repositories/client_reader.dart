import 'dart:async';

import '../models/catalogs.dart';

/// Lectura del catálogo de clientes.
abstract class ClientReader {
  Stream<List<Client>> watchAll();

  Future<Client?> getById(String id);
}
