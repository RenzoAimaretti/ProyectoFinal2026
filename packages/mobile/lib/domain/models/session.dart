/// Sesión local persistida (CUU00).
///
/// `id` es nullable porque en el alta lo genera la base (drift `clientDefault`);
/// tras leerla desde SQLite siempre está presente.
class Session {
  const Session({
    this.id,
    required this.userId,
    required this.email,
    required this.fullName,
    required this.role,
    required this.token,
    this.companyId,
    this.refreshToken,
    required this.lastAccessedAt,
  });

  final String? id;
  final String userId;
  final String email;
  final String fullName;

  /// Rol tal cual llega del backend (ver [UserRole] en `enums.dart`).
  final String role;
  final String token;
  final String? companyId;

  /// Refresh token persistido (Sprint 2). Nullable porque el login demo crea
  /// sesión sin tokens (`token: ''`).
  final String? refreshToken;
  final DateTime lastAccessedAt;

  /// Copia la sesión cambiando la firma activa (persistida al seleccionar otra
  /// firma en el selector global post-login) o los tokens renovados. El resto
  /// de campos se preserva.
  Session copyWith({String? companyId, String? token, String? refreshToken}) {
    return Session(
      id: id,
      userId: userId,
      email: email,
      fullName: fullName,
      role: role,
      token: token ?? this.token,
      companyId: companyId ?? this.companyId,
      refreshToken: refreshToken ?? this.refreshToken,
      lastAccessedAt: lastAccessedAt,
    );
  }
}
