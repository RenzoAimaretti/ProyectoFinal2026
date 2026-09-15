import 'package:drift/drift.dart' show Value;

import '../../domain/models/session.dart' as domain;
import '../services/app_database.dart';

/// Fila drift `SessionRow` → modelo de dominio `Session`.
extension SessionRowMapper on SessionRow {
  domain.Session toDomain() => domain.Session(
        id: id,
        userId: userId,
        email: email,
        fullName: fullName,
        role: role,
        token: token,
        companyId: companyId,
        lastAccessedAt: lastAccessedAt,
      );
}

/// Modelo de dominio `Session` → companion drift para insertar.
extension SessionDomainMapper on domain.Session {
  SessionsCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return SessionsCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      userId: userId,
      email: email,
      fullName: fullName,
      role: role,
      token: token,
      companyId: Value.absentIfNull(companyId),
      lastAccessedAt: lastAccessedAt,
    );
  }
}
