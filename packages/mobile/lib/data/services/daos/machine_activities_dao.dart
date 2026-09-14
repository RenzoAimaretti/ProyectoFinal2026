import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/machine_tables.dart';

part 'machine_activities_dao.g.dart';

/// Fila de join `MachineActivities ⋈ Machines` para listados con nombre.
class MachineActivitySummaryRow {
  const MachineActivitySummaryRow({
    required this.id,
    required this.machineId,
    required this.machineName,
    required this.type,
    required this.date,
  });

  final String id;
  final String machineId;
  final String machineName;
  final String type;
  final DateTime date;
}

@DriftAccessor(tables: [MachineActivities])
class MachineActivitiesDao extends DatabaseAccessor<AppDatabase>
    with _$MachineActivitiesDaoMixin {
  MachineActivitiesDao(AppDatabase db) : super(db);

  Stream<List<MachineActivity>> watchByMachine(
    String machineId, {
    DateTime? from,
    DateTime? to,
  }) {
    return (select(machineActivities)
          ..where((t) {
            Expression<bool> predicate = t.machineId.equals(machineId);
            if (from != null) {
              predicate = predicate & t.date.isBiggerOrEqualValue(from);
            }
            if (to != null) {
              predicate = predicate & t.date.isSmallerOrEqualValue(to);
            }
            return predicate;
          })
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  Stream<List<MachineActivity>> watchByCompany(String companyId) {
    return (select(machineActivities)
          ..where((t) => t.companyId.equals(companyId))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  Stream<List<MachineActivity>> watchAll() {
    return (select(machineActivities)
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .watch();
  }

  /// Actividades con `machineName` resuelto (join D2).
  Stream<List<MachineActivitySummaryRow>> watchSummaries({String? companyId}) {
    final query = select(machineActivities).join([
      innerJoin(machines, machines.id.equalsExp(machineActivities.machineId)),
    ]);
    if (companyId != null) {
      query.where(machineActivities.companyId.equals(companyId));
    }
    query.orderBy([OrderingTerm.desc(machineActivities.date)]);
    return query.map((row) {
      final activity = row.readTable(machineActivities);
      return MachineActivitySummaryRow(
        id: activity.id,
        machineId: activity.machineId,
        machineName: row.readTable(machines).name,
        type: activity.type,
        date: activity.date,
      );
    }).watch();
  }
}
