import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/stock_tables.dart';

part 'receptions_dao.g.dart';

/// Fila de join `Receptions ⋈ Clients` para listados con nombre de cliente.
class ReceptionSummaryRow {
  const ReceptionSummaryRow({
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
  final String status;
}

@DriftAccessor(tables: [Receptions])
class ReceptionsDao extends DatabaseAccessor<AppDatabase>
    with _$ReceptionsDaoMixin {
  ReceptionsDao(AppDatabase db) : super(db);

  Stream<List<Reception>> watchAll() {
    return (select(receptions)
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  /// Recepciones con `clientName` resuelto (join D2).
  Stream<List<ReceptionSummaryRow>> watchSummaries() {
    final query = select(receptions).join([
      innerJoin(clients, clients.id.equalsExp(receptions.clientId)),
    ])
      ..orderBy([OrderingTerm.desc(receptions.date)]);
    return query.map((row) {
      final reception = row.readTable(receptions);
      return ReceptionSummaryRow(
        id: reception.id,
        clientId: reception.clientId,
        clientName: row.readTable(clients).name,
        date: reception.date,
        status: reception.status,
      );
    }).watch();
  }
}
