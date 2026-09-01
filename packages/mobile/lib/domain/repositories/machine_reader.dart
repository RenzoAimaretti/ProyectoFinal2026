import 'dart:async';

import '../models/catalogs.dart';

/// Lectura de máquinas por firma.
abstract class MachineReader {
  Stream<List<Machine>> watchByCompany(String companyId);

  Future<Machine?> getById(String id);
}
