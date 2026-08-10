import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/config/api_config.dart';
import '../models/login_response_model.dart';

class AuthException implements Exception {
  const AuthException(this.message, [this.statusCode]);

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class AccountLockedException extends AuthException {
  const AccountLockedException(
    String message, {
    this.remainingSeconds,
    int? statusCode = 423,
  }) : super(message, statusCode);

  final int? remainingSeconds;
}

/// Servicio API de autenticación que interactúa con los endpoints de NestJS.
class AuthApiService {
  AuthApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _client;
  final String _baseUrl;

  /// Ejecuta POST /auth/login
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) async {
    final url = Uri.parse('$_baseUrl/auth/login');
    try {
      final response = await _client.post(
        url,
        headers: const {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final dynamic data = jsonDecode(response.body);
      final Map<String, dynamic> jsonMap =
          data is Map<String, dynamic> ? data : {};

      if (response.statusCode == 200) {
        return LoginResponseModel.fromJson(jsonMap);
      } else if (response.statusCode == 423) {
        final message = jsonMap['message']?.toString() ??
            'Cuenta bloqueada temporalmente por exceso de intentos fallidos';
        final remainingSeconds = jsonMap['remainingSeconds'] as int?;
        throw AccountLockedException(
          message,
          remainingSeconds: remainingSeconds,
        );
      } else if (response.statusCode == 401) {
        final message = jsonMap['message']?.toString() ??
            'Usuario o contraseña incorrectos';
        throw AuthException(message, 401);
      } else {
        final message =
            jsonMap['message']?.toString() ?? 'Error de autenticación';
        throw AuthException(message, response.statusCode);
      }
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException('No se pudo conectar con el servidor. Verifique su conexión.');
    }
  }

  /// Ejecuta POST /auth/refresh
  Future<Map<String, String>> refresh(String refreshToken) async {
    final url = Uri.parse('$_baseUrl/auth/refresh');
    try {
      final response = await _client.post(
        url,
        headers: const {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      final Map<String, dynamic> jsonMap = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'accessToken': jsonMap['accessToken'] as String,
          'refreshToken': jsonMap['refreshToken'] as String,
        };
      } else {
        throw AuthException(
            jsonMap['message']?.toString() ?? 'Error al renovar token',
            response.statusCode);
      }
    } catch (e) {
      throw AuthException('Error al comunicarse con el servidor: $e');
    }
  }

  /// Ejecuta POST /auth/logout
  Future<void> logout(String refreshToken) async {
    final url = Uri.parse('$_baseUrl/auth/logout');
    try {
      await _client.post(
        url,
        headers: const {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );
    } catch (_) {
      // Silenciar errores durante logout
    }
  }
}
