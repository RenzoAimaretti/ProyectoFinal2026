import 'dart:async';

import '../models/enums.dart';
import '../models/session.dart';
import '../repositories/session_repository.dart';

/// CUU00 (modo demo): login offline sin backend, para desarrollo y demos.
///
/// Crea una sesión de operario y la persiste localmente. No toca
/// [AuthRepository]: el flujo demo no requiere servidor disponible.
class DemoLoginUseCase {
  DemoLoginUseCase(this._sessionRepository);

  final SessionRepository _sessionRepository;

  Future<Session> execute() async {
    final session = Session(
      userId: 'demo-operario',
      email: 'operario@demo.com',
      fullName: 'Operario Demo',
      role: UserRole.operario,
      token: '',
      companyId: null,
      lastAccessedAt: DateTime.now(),
    );
    await _sessionRepository.save(session);
    return session;
  }
}
