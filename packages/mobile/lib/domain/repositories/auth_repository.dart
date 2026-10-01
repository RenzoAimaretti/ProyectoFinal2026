import 'dart:async';

import '../models/session.dart';

/// Puerto de autenticación (contrato movido desde `data/repositories` — D10).
///
/// `login` devuelve la sesión ya lista para persistir; el adaptador HTTP mapea
/// la respuesta del backend a [Session].
abstract class AuthRepository {
  Future<Session> login({
    required String email,
    required String password,
  });

  /// Best-effort: el adaptador revoca el token remoto sin lanzar errores.
  ///
  /// `refreshToken` es el token persistido en la sesión; el caller (use case)
  /// lo lee y lo pasa para que el adaptador no retenga estado en memoria.
  Future<void> logout({String? refreshToken});
}
