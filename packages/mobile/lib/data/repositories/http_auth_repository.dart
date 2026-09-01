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
class HttpAuthRepository implements AuthRepository {
  HttpAuthRepository({AuthApiService? apiService})
      : _apiService = apiService ?? AuthApiService();

  final AuthApiService _apiService;

  /// El refresh token no se persiste en `Session` (la tabla `Sessions` no lo
  /// tiene); se retiene en memoria para el `logout` best-effort del proceso.
  String? _refreshToken;

  @override
  Future<Session> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.login(email: email, password: password);
    _refreshToken = response.refreshToken;
    return _mapToSession(response);
  }

  @override
  Future<void> logout() async {
    final token = _refreshToken;
    if (token != null) {
      await _apiService.logout(token);
    }
    _refreshToken = null;
  }

  Session _mapToSession(LoginResponseModel response) {
    final user = response.user;
    return Session(
      userId: user.id,
      email: user.email,
      fullName: _deriveFullName(user),
      role: user.role,
      token: response.accessToken,
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
