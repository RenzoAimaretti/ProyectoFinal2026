import 'dart:async';

import '../repositories/auth_repository.dart';
import '../repositories/session_repository.dart';

/// CUU00: revocación remota (best-effort) + limpieza de la sesión local.
class LogoutUseCase {
  LogoutUseCase(this._authRepository, this._sessionRepository);

  final AuthRepository _authRepository;
  final SessionRepository _sessionRepository;

  Future<void> execute() async {
    try {
      final session = await _sessionRepository.current();
      await _authRepository.logout(refreshToken: session?.refreshToken);
    } catch (_) {
      // best-effort: el logout local no debe fallar por falta de red.
    }
    await _sessionRepository.clear();
  }
}
