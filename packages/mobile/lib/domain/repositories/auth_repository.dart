import '../../data/models/login_response_model.dart';

/// Puerto de dominio para la autenticación (REQ-F4-02).
///
/// Define el contrato que la capa de aplicación (ViewModel) consume,
/// desacoplado de la implementación HTTP. La firma de [login] está
/// congelada: `login({required email, required password})`.
abstract class AuthRepository {
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  });
}
