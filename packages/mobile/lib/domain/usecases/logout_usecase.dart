import 'dart:async';

import '../errors.dart';
import '../repositories/auth_repository.dart';
import '../repositories/local_data_repository.dart';
import '../repositories/session_repository.dart';

/// CUU00: cierre de sesión.
///
/// Si quedan registros sin sincronizar y no se confirmó el descarte, lanza
/// [PendingSyncOnLogoutException] sin tocar nada. Si no, revoca el token
/// remoto (best-effort), borra los datos locales del usuario (catálogo,
/// registros y outbox) y limpia la sesión: el próximo usuario nunca hereda
/// datos ni envíos pendientes de otro.
class LogoutUseCase {
  LogoutUseCase(this._authRepository, this._sessionRepository, this._localData);

  final AuthRepository _authRepository;
  final SessionRepository _sessionRepository;
  final LocalDataRepository _localData;

  Future<void> execute({bool discardPending = false}) async {
    final pending = await _localData.countPendingSync();
    if (pending > 0 && !discardPending) {
      throw PendingSyncOnLogoutException(pending);
    }

    try {
      final session = await _sessionRepository.current();
      await _authRepository.logout(refreshToken: session?.refreshToken);
    } catch (_) {
      // best-effort: el logout local no debe fallar por falta de red.
    }
    await _localData.clearAll();
    await _sessionRepository.clear();
  }
}
