import 'dart:async';

import '../models/catalogs.dart';
import '../models/machine_activity_summary.dart';
import '../models/machine_history_entry.dart';
import '../models/machine_usage.dart';
import '../repositories/machine_reader.dart';
import '../repositories/machine_usage_repository.dart';
import 'list_machine_activities_usecase.dart';

/// Combines local legacy activities and task usages for presentation only.
/// Sources stay independent: matching IDs across sources are not duplicates.
class ListMachineHistoryUseCase {
  const ListMachineHistoryUseCase(this._activities, this._usages, this._machines);

  final ListMachineActivitiesUseCase _activities;
  final MachineUsageRepository _usages;
  final MachineReader _machines;

  Stream<List<MachineHistoryEntry>> watchByCompany(String? companyId) {
    late StreamController<List<MachineHistoryEntry>> controller;
    final subscriptions = <StreamSubscription<Object>>[];
    List<MachineActivitySummary>? activityRows;
    List<MachineUsage>? usageRows;
    List<Machine>? machineRows;

    void emit() {
      if (activityRows == null || usageRows == null || machineRows == null) return;
      final machines = {for (final machine in machineRows!) machine.id: machine};
      final result = <MachineHistoryEntry>[];
      final seenActivities = <String>{};
      for (final row in activityRows!) {
        if (!seenActivities.add(row.id)) continue;
        result.add(MachineHistoryEntry(
          id: row.id, machineId: row.machineId, machineName: row.machineName,
          date: row.date, type: row.type,
        ));
      }
      final seenUsages = <String>{};
      for (final usage in usageRows!) {
        final machine = machines[usage.machineId];
        if (machine == null ||
            (companyId != null && machine.companyId != companyId) ||
            !seenUsages.add(usage.id ?? '')) {
          continue;
        }
        result.add(MachineHistoryEntry(
          id: usage.id ?? '', machineId: usage.machineId,
          machineName: machine.name, date: usage.workDate,
        ));
      }
      result.sort((a, b) => b.date.compareTo(a.date));
      controller.add(result);
    }

    controller = StreamController<List<MachineHistoryEntry>>(
      onListen: () {
        subscriptions.add(_activities.watchSummaries(companyId).listen(
          (rows) { activityRows = rows; emit(); },
          onError: controller.addError,
        ));
        subscriptions.add(_usages.watchAll().listen(
          (rows) { usageRows = rows; emit(); },
          onError: controller.addError,
        ));
        subscriptions.add(_machines.watchAll().listen(
          (rows) { machineRows = rows; emit(); },
          onError: controller.addError,
        ));
      },
      onCancel: () async {
        for (final subscription in subscriptions) {
          await subscription.cancel();
        }
      },
    );
    return controller.stream;
  }
}
