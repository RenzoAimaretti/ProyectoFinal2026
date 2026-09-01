import 'dart:async';

import '../models/session.dart';
import '../repositories/session_repository.dart';

/// CUU00: restaura la sesión local (reapertura offline).
class RestoreSessionUseCase {
  RestoreSessionUseCase(this._sessionRepository);

  final SessionRepository _sessionRepository;

  Future<Session?> execute() => _sessionRepository.current();
}
