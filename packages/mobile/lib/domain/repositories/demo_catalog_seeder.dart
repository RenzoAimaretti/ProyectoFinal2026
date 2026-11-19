/// Carga el catálogo ficticio del modo demo (sin backend).
abstract class DemoCatalogSeeder {
  /// Idempotente: solo completa las tablas que están vacías.
  Future<void> seed();
}
