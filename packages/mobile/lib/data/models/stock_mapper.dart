import '../../domain/models/stock.dart' as domain;
import '../services/app_database.dart';

/// Fila drift `Stock` → modelo de dominio `Stock`.
///
/// El dominio solo lee el stock (el alta/incremento lo materializa la
/// validación de recepciones), por lo que no hay `fromDomain`: la escritura
/// usa `upsertIncrement` (incremento atómico, no una inserción de entidad).
extension StockRowMapper on Stock {
  domain.Stock toDomain() => domain.Stock(
        id: id,
        clientId: clientId,
        inputId: inputId,
        quantity: quantity,
        updatedAt: updatedAt,
      );
}
