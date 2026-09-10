import 'dart:async';

import '../models/catalogs.dart';

/// Lectura de máquinas por firma.
abstract class MachineReader {
  /// Todas las máquinas, para el selector del formulario (demo).
  Stream<List<Machine>> watchAll();

  Stream<List<Machine>> watchByCompany(String companyId);

  Future<Machine?> getById(String id);
}
