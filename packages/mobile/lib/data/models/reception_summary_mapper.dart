import '../../domain/models/reception_summary.dart' as domain;
import '../services/daos/receptions_dao.dart';
import 'enum_converters.dart';

/// Fila de join `ReceptionSummaryRow` → modelo `ReceptionSummary`.
extension ReceptionSummaryRowMapper on ReceptionSummaryRow {
  domain.ReceptionSummary toDomain() => domain.ReceptionSummary(
        id: id,
        clientId: clientId,
        clientName: clientName,
        date: date,
        status: receptionStatusFromText(status),
      );
}
