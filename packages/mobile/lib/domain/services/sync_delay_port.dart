/// Abstracción del backoff (testeable sin timers reales).
///
/// El adaptador de producción (`FlutterSyncDelayer`) delega en
/// `Future.delayed`; los tests inyectan un fake instantáneo.
abstract class SyncDelayPort {
  Future<void> delay(Duration duration);
}
