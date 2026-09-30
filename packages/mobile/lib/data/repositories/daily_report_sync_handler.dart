import '../../domain/errors.dart';
import '../../domain/models/sync_queue_item.dart';
import '../../domain/repositories/daily_report_remote_repository.dart';
import '../../domain/repositories/session_repository.dart';
import '../../domain/services/sync_entity_handler.dart';
import '../models/daily_report_mapper.dart';
import '../services/app_database.dart';
import 'token_refresher.dart';

/// Handler concreto de `DAILY_REPORT` (Sprint 2, CUU05).
///
/// Resuelve el parte desde drift, arma el payload wire y hace push con el
/// access token de la sesión. Ante 401 refresca el token y reintenta UNA vez
/// (spec C2); si el refresh falla o el token renovado sigue rechazado, la fila
/// queda `FAILED` vía [SyncPermanentException].
class DailyReportSyncHandler implements SyncEntityHandler {
  DailyReportSyncHandler({
    required AppDatabase db,
    required DailyReportRemoteRepository remoteRepository,
    required SessionRepository sessionRepository,
    required TokenRefresher tokenRefresher,
  })  : _db = db,
        _remoteRepository = remoteRepository,
        _sessionRepository = sessionRepository,
        _tokenRefresher = tokenRefresher;

  final AppDatabase _db;
  final DailyReportRemoteRepository _remoteRepository;
  final SessionRepository _sessionRepository;
  final TokenRefresher _tokenRefresher;

  @override
  Future<void> handle(SyncQueueItem item) async {
    final report = await _db.dailyReportsDao.getById(item.entityId);
    if (report == null) {
      throw SyncPermanentException(
        'Parte diario ${item.entityId} no encontrado',
      );
    }
    final items = await _db.dailyReportsDao.itemsByReportId(item.entityId);

    final session = await _sessionRepository.current();
    final token = session?.token ?? '';
    if (token.isEmpty) {
      throw const SyncPermanentException('No hay sesión activa para sincronizar');
    }

    final domainReport = report.toDomain();
    final domainItems = items.map((i) => i.toDomain()).toList();

    try {
      await _remoteRepository.push(domainReport, domainItems, token: token);
    } on SyncUnauthorizedException {
      // Refresh-on-401 con UN solo retry.
      final newToken = await _tokenRefresher.refreshAccessToken();
      try {
        await _remoteRepository.push(domainReport, domainItems, token: newToken);
      } on SyncUnauthorizedException {
        throw const SyncPermanentException(
          'Sesión expirada: el token renovado fue rechazado',
        );
      }
    }
  }
}
