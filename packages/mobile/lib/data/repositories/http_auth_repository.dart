import '../../domain/models/auth_user.dart';
import '../../domain/models/session.dart';
import '../../domain/repositories/auth_repository.dart';
import '../models/login_response_model.dart';
import '../services/auth_api_service.dart';

/// Implementación HTTP del puerto [AuthRepository] (D10).
///
/// Extraída del antiguo `data/repositories/auth_repository.dart`; ahora el
/// contrato vive en `domain/repositories/auth_repository.dart` y esta clase es
/// solo un adaptador de salida que consume `AuthApiService`.
///
/// El refresh token se persiste en `Session` (Sprint 2): fuente única de verdad
/// SQLite, sin estado en memoria.
class HttpAuthRepository implements AuthRepository {
  HttpAuthRepository({AuthApiService? apiService})
      : _apiService = apiService ?? AuthApiService();

  final AuthApiService _apiService;

  @override
  Future<Session> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.login(email: email, password: password);
    return _mapToSession(response);
  }

  @override
  Future<void> logout({String? refreshToken}) async {
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _apiService.logout(refreshToken);
    }
  }

  Session _mapToSession(LoginResponseModel response) {
    final user = response.user;
    return Session(
      userId: user.id,
      email: user.email,
      fullName: _deriveFullName(user),
      role: user.role,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      companyId: user.firmaId,
      lastAccessedAt: DateTime.now(),
    );
  }

  /// El backend no envía `fullName` (`AuthUser` solo trae id/email/role/firmaId),
  /// por lo que derivamos un nombre legible del prefijo del email (la parte
  /// anterior al '@' es el identificador habitual de los usuarios operarios).
  String _deriveFullName(AuthUser user) {
    final at = user.email.indexOf('@');
    return at > 0 ? user.email.substring(0, at) : user.email;
  }
}
