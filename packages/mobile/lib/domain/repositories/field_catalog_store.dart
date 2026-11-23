import '../models/field_catalog.dart';

/// Caché local del catálogo de campo (puerto de salida).
abstract class FieldCatalogStore {
  /// Aplica [catalog] como foto autoritativa: inserta o actualiza lo que viene
  /// y retira lo que ya no viene, salvo filas que algún registro local todavía
  /// referencia.
  Future<void> replaceWith(FieldCatalog catalog);
}
