/// Datos de negocio guardados en el dispositivo (catálogo, registros locales y
/// outbox de sincronización), sin incluir la sesión.
abstract class LocalDataRepository {
  /// Filas del outbox que todavía no llegaron al backend.
  Future<int> countPendingSync();

  /// Borra todos los datos de negocio locales. El próximo usuario arranca con
  /// el dispositivo limpio y descarga su propio catálogo.
  Future<void> clearAll();
}
