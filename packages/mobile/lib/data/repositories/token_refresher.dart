import '../../domain/errors.dart';
import '../../domain/repositories/session_repository.dart';
import '../services/auth_api_service.dart';

/// Renueva el access token (refresh-on-401) y persiste los tokens renovados.
///
/// Fuente única de verdad del refresh token: SQLite (la sesión persistida). Si
/// no hay `refreshToken` o el refresh falla, limpia la sesión y lanza
/// [SyncPermanentException]: la fila queda `FAILED` y el próximo arranque va a
/// login (spec C2).
class TokenRefresher {
  TokenRefresher(this._apiService, this._sessionRepository);

  final AuthApiService _apiService;
  final SessionRepository _sessionRepository;

  /// Devuelve el access token renovado.
  Future<String> refreshAccessToken() async {
    final session = await _sessionRepository.current();
    final refreshToken = session?.refreshToken;
    if (session == null || refreshToken == null || refreshToken.isEmpty) {
      await _sessionRepository.clear();
      throw const SyncPermanentException(
        'Sesión expirada: no hay refresh token disponible',
      );
    }

    try {
      final tokens = await _apiService.refresh(refreshToken);
      final updated = session.copyWith(
        token: tokens['accessToken']!,
        refreshToken: tokens['refreshToken'],
      );
      await _sessionRepository.save(updated);
      return updated.token;
    } on AuthException {
      await _sessionRepository.clear();
      throw const SyncPermanentException('Sesión expirada: refresh inválido');
    }
  }
}
