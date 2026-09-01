import 'enums.dart';

/// Parte diario de labor (CUU05). Cabecera + ítems de consumo.
///
/// `id`, `createdAt` y `updatedAt` son nullable: en el alta los genera la base
/// (drift), por lo que un parte "borrador" aún no los tiene.
class DailyReport {
  const DailyReport({
    this.id,
    required this.operatorId,
    required this.companyId,
    required this.lotId,
    required this.laborTypeId,
    required this.date,
    required this.hectares,
    required this.hours,
    required this.status,
    this.rejectionReason,
    this.approvedAt,
    this.approvedBy,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String operatorId;
  final String companyId;
  final String lotId;
  final String laborTypeId;
  final DateTime date;
  final double hectares;
  final double hours;
  final DailyReportStatus status;
  final String? rejectionReason;
  final DateTime? approvedAt;
  final String? approvedBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

/// Ítem de consumo del parte: insumo + cantidad + unidad.
///
/// No lleva `id` ni referencia al padre: viaja embebido en la cabecera y el
/// adaptador le asigna la FK y el uuid durante el insert transaccional.
class DailyReportItem {
  const DailyReportItem({
    required this.inputId,
    required this.quantity,
    required this.unit,
  });

  final String inputId;
  final double quantity;
  final String unit;
}
