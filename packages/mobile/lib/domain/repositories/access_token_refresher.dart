/// Renueva el access token de la sesión actual (refresh-on-401).
///
/// Devuelve el token renovado y lo persiste en la sesión. Si no hay refresh
/// token o el backend lo rechaza, lanza `SyncPermanentException`.
abstract class AccessTokenRefresher {
  Future<String> refreshAccessToken();
}
