import 'enums.dart';

/// Resumen de recepción para listados con nombre de cliente resuelto
/// (`Receptions ⋈ Clients`).
class ReceptionSummary {
  const ReceptionSummary({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.date,
    required this.status,
  });

  final String id;
  final String clientId;
  final String clientName;
  final DateTime date;
  final ReceptionStatus status;
}
