import '../../domain/services/sync_delay_port.dart';

/// Implementación de producción del backoff: delega en `Future.delayed`.
class FlutterSyncDelayer implements SyncDelayPort {
  @override
  Future<void> delay(Duration duration) => Future<void>.delayed(duration);
}
