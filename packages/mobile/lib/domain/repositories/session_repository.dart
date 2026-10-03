import 'dart:async';

import '../models/session.dart';

/// Persistencia local de la sesión (CUU00).
abstract class SessionRepository {
  Future<void> save(Session session);

  Future<Session?> current();

  Future<void> clear();
}
