import 'dart:async';

import '../models/session.dart';
import '../repositories/auth_repository.dart';
import '../repositories/session_repository.dart';

/// CUU00: login remoto → persistencia local de la sesión.
class LoginUseCase {
  LoginUseCase(this._authRepository, this._sessionRepository);

  final AuthRepository _authRepository;
  final SessionRepository _sessionRepository;

  Future<Session> execute({
    required String email,
    required String password,
  }) async {
    final session = await _authRepository.login(email: email, password: password);
    await _sessionRepository.save(session);
    return session;
  }
}
