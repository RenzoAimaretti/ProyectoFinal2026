import '../../data/models/login_response_model.dart';
import '../repositories/auth_repository.dart';

/// Caso de uso de login (extensión solicitada por el orquestador, más allá del
/// design.md de este cambio).
///
/// Thin y behavior-neutral (REQ-F4-03): delega al puerto [AuthRepository] sin
/// transformar datos, sin mapear errores y sin estado propio. Establece el
/// punto de orquestación de la capa de dominio para lógica más compleja en el
/// futuro; hoy el ViewModel inyecta el puerto directamente (SC-MOB-01).
class LoginUseCase {
  const LoginUseCase({required AuthRepository authRepository})
      : _authRepository = authRepository;

  final AuthRepository _authRepository;

  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) {
    return _authRepository.login(email: email, password: password);
  }
}
