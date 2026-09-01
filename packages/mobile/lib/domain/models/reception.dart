import 'enums.dart';

/// Recepción de insumos del cliente (CUU06).
///
/// `id`, `createdAt` y `updatedAt` son nullable: los genera la base en el alta.
class Reception {
  const Reception({
    this.id,
    required this.clientId,
    required this.date,
    required this.status,
    this.rejectionReason,
    this.validatedBy,
    this.validatedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String clientId;
  final DateTime date;
  final ReceptionStatus status;
  final String? rejectionReason;
  final String? validatedBy;
  final DateTime? validatedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

/// Ítem de la recepción: insumo + cantidad + unidad.
///
/// No lleva `id` ni referencia al padre (viaja embebido en la cabecera).
class ReceptionItem {
  const ReceptionItem({
    required this.inputId,
    required this.quantity,
    required this.unit,
  });

  final String inputId;
  final double quantity;
  final String unit;
}
