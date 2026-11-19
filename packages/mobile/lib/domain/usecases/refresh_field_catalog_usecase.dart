import '../repositories/field_catalog_source.dart';
import '../repositories/field_catalog_store.dart';
import '../repositories/session_repository.dart';

/// Refresca el catálogo de campo local con la foto autoritativa del backend.
///
/// Sin sesión con token (demo o logout) no hace nada y devuelve 0: el móvil
/// sigue operando con lo cacheado. Un error de red se propaga al caller, que lo
/// trata como best-effort para no bloquear la app; la caché queda intacta.
class RefreshFieldCatalogUseCase {
  RefreshFieldCatalogUseCase({
    required FieldCatalogSource source,
    required FieldCatalogStore store,
    required SessionRepository sessionRepository,
  })  : _source = source,
        _store = store,
        _sessionRepository = sessionRepository;

  final FieldCatalogSource _source;
  final FieldCatalogStore _store;
  final SessionRepository _sessionRepository;

  Future<int> execute() async {
    final session = await _sessionRepository.current();
    final token = session?.token ?? '';
    if (token.isEmpty) return 0;

    final catalog = await _source.fetch(token: token);
    await _store.replaceWith(catalog);
    return catalog.rowCount;
  }
}
