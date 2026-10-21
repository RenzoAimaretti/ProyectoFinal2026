import '../repositories/session_repository.dart';
import '../../data/repositories/drift_field_catalog_repository.dart';
import '../../data/services/field_catalog_api_service.dart';

/// Refresca el catálogo de campo local (T14).
///
/// Sin sesión con token (demo o logout) no hace nada y devuelve 0: el móvil
/// sigue operando con lo cacheado. Un error de red se propaga al caller, que lo
/// trata como best-effort para no bloquear la app.
class RefreshFieldCatalogUseCase {
  RefreshFieldCatalogUseCase({
    required FieldCatalogApiService apiService,
    required DriftFieldCatalogRepository cache,
    required SessionRepository sessionRepository,
  })  : _apiService = apiService,
        _cache = cache,
        _sessionRepository = sessionRepository;

  final FieldCatalogApiService _apiService;
  final DriftFieldCatalogRepository _cache;
  final SessionRepository _sessionRepository;

  Future<int> execute() async {
    final session = await _sessionRepository.current();
    final token = session?.token ?? '';
    if (token.isEmpty) return 0;

    final catalog = await _apiService.fetch(token: token);
    await _cache.save(catalog);
    return catalog.rowCount;
  }
}
