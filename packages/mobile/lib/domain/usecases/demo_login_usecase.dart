import 'dart:async';

import '../models/enums.dart';
import '../models/session.dart';
import '../repositories/demo_catalog_seeder.dart';
import '../repositories/session_repository.dart';

/// CUU00 (modo demo): login offline sin backend, para desarrollo y demos.
///
/// Crea una sesión de operario, la persiste localmente y siembra el catálogo
/// ficticio. No toca [AuthRepository]: el flujo demo no requiere servidor. Es
/// el único punto donde se cargan datos demo, así nunca se mezclan con los de
/// un login real.
class DemoLoginUseCase {
  DemoLoginUseCase(this._sessionRepository, this._demoCatalog);

  final SessionRepository _sessionRepository;
  final DemoCatalogSeeder _demoCatalog;

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
    await _demoCatalog.seed();
    await _sessionRepository.save(session);
    return session;
  }
}
