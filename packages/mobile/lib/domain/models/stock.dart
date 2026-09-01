/// Stock global por cliente + insumo (CUU06).
///
/// Solo se materializa tras la validación de una recepción (`UNIQUE(clientId,
/// inputId)` en SQLite); el dominio nunca lo crea directamente, solo lo lee.
class Stock {
  const Stock({
    required this.id,
    required this.clientId,
    required this.inputId,
    required this.quantity,
    required this.updatedAt,
  });

  final String id;
  final String clientId;
  final String inputId;
  final double quantity;
  final DateTime updatedAt;
}
