import '../models/field_catalog.dart';

/// Fuente remota del catálogo de campo (puerto de salida).
///
/// Errores esperados: `SyncUnauthorizedException` (401),
/// `SyncPermanentException` (4xx o respuesta inválida) y
/// `SyncRetriableException` (5xx o sin red).
abstract class FieldCatalogSource {
  Future<FieldCatalog> fetch({required String token});
}
