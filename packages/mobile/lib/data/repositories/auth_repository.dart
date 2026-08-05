import '../../domain/repositories/auth_repository.dart';
import '../models/login_response_model.dart';
import '../services/auth_api_service.dart';

export '../../domain/repositories/auth_repository.dart' show AuthRepository;

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
