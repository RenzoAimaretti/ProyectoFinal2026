import 'dart:async';

import '../models/reception.dart';
import '../models/reception_summary.dart';

/// Persistencia de recepciones de insumos (CUU06). Solo lectura en el móvil:
/// la validación es una responsabilidad del backend (CUU06 read-only).
abstract class ReceptionRepository {
  /// Crea cabecera + ítems en una única transacción y devuelve el `id`
  /// generado, para que el formulario asocie las fotos (R008) a la entidad
  /// recién creada.
  Future<String> create(Reception reception, List<ReceptionItem> items);

  /// Todas las recepciones (sin filtro de estado), ordenadas por fecha desc.
  Stream<List<Reception>> watchAll();

  /// Recepciones con `clientName` resuelto para listados (D2).
  Stream<List<ReceptionSummary>> watchSummaries();
}
