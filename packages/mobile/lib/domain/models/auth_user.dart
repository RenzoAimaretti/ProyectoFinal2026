/// Modelo de dominio para el usuario autenticado.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    required this.firmaId,
  });

  final String id;
  final String email;
  final String role;
  final String firmaId;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      firmaId: json['firmaId'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'firmaId': firmaId,
    };
  }
}
