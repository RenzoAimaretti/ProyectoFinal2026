import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/machine_tables.dart';

part 'machine_activities_dao.g.dart';

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
}
