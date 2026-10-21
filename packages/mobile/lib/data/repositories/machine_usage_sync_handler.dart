import '../../domain/errors.dart';
import '../../domain/models/machine_usage.dart' as domain;
import '../../domain/models/sync_queue_item.dart';
import '../../domain/repositories/machine_usage_remote_repository.dart';
import '../../domain/repositories/session_repository.dart';
import '../../domain/services/sync_entity_handler.dart';
import '../models/machine_usage_mapper.dart';
import '../services/app_database.dart';
import 'token_refresher.dart';

/// Handler concreto de `MACHINE_USAGE` (T12, CUU08 R021).
///
/// Resuelve el uso desde drift y lo empuja con el **UUID local**, que el
/// backend usa para que un reintento no duplique horas. Ante 401 refresca el
/// token y reintenta UNA vez; si el refresh falla o el token renovado sigue
/// rechazado, la fila queda `FAILED` vía [SyncPermanentException].
class MachineUsageSyncHandler implements SyncEntityHandler {
  MachineUsageSyncHandler({
    required AppDatabase db,
    required MachineUsageRemoteRepository remoteRepository,
    required SessionRepository sessionRepository,
    required TokenRefresher tokenRefresher,
  })  : _db = db,
        _remoteRepository = remoteRepository,
        _sessionRepository = sessionRepository,
        _tokenRefresher = tokenRefresher;

  final AppDatabase _db;
  final MachineUsageRemoteRepository _remoteRepository;
  final SessionRepository _sessionRepository;
  final TokenRefresher _tokenRefresher;

  @override
  Future<void> handle(SyncQueueItem item) async {
    final row = await _db.machineUsagesDao.getById(item.entityId);
    if (row == null) {
      throw SyncPermanentException(
        'Uso de maquinaria ${item.entityId} no encontrado',
      );
    }

    final session = await _sessionRepository.current();
    final token = session?.token ?? '';
    if (token.isEmpty) {
      throw const SyncPermanentException('No hay sesión activa para sincronizar');
    }

    final payload = _payload(row.toDomain());

    try {
      await _remoteRepository.push(payload, token: token);
    } on SyncUnauthorizedException {
      final newToken = await _tokenRefresher.refreshAccessToken();
      try {
        await _remoteRepository.push(payload, token: newToken);
      } on SyncUnauthorizedException {
        throw const SyncPermanentException(
          'Sesión expirada: el token renovado fue rechazado',
        );
      }
    }
  }

  Map<String, dynamic> _payload(domain.MachineUsage usage) {
    return {
      'id': usage.id,
      'machineId': usage.machineId,
      'taskId': usage.taskId,
      'operatorId': usage.operatorId,
      if (usage.usageHours != null) 'usageHours': usage.usageHours,
      if (usage.hectares != null) 'hectares': usage.hectares,
      'workDate': _dateOnly(usage.workDate),
      if (usage.observations != null) 'observations': usage.observations,
    };
  }

  /// Fecha de trabajo sin hora: la actividad ocurrió ese día en el campo.
  /// Se normaliza a UTC para que el día no se corra al cruzar zonas horarias.
  String _dateOnly(DateTime date) {
    final utc = date.toUtc();
    final month = utc.month.toString().padLeft(2, '0');
    final day = utc.day.toString().padLeft(2, '0');
    return '${utc.year}-$month-$day';
  }
}
