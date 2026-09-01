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
  final DateTime lastAccessedAt;
}
