import '../models/login_response_model.dart';
import '../services/auth_api_service.dart';

abstract class AuthRepository {
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  });
}

/// Implementación del repositorio consumiendo la API de autenticación de NestJS.
class HttpAuthRepository implements AuthRepository {
  HttpAuthRepository({AuthApiService? apiService})
      : _apiService = apiService ?? AuthApiService();

  final AuthApiService _apiService;

  @override
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) {
    return _apiService.login(email: email, password: password);
  }
}
