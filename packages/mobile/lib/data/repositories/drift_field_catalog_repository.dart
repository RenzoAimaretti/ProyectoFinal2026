import 'package:drift/drift.dart';

import '../../domain/models/enums.dart';
import '../models/enum_converters.dart';
import '../models/enum_wire_mapper.dart';
import '../services/app_database.dart';
import '../services/field_catalog_api_service.dart';

/// Caché local del catálogo de campo (T14).
///
/// Escribe en orden de dependencias (firma → clientes → campos → lotes →
/// labores → máquinas → tareas → operarios) para respetar las claves foráneas.
/// Es idempotente: reejecutar el pull actualiza nombres/estados y reemplaza las
/// asignaciones de cada tarea, sin duplicar filas.
class DriftFieldCatalogRepository {
  DriftFieldCatalogRepository(this._db);

  final AppDatabase _db;

  Future<void> save(FieldCatalog catalog) {
    return _db.transaction(() async {
      for (final company in catalog.companies) {
        await _db.into(_db.companies).insertOnConflictUpdate(
              CompaniesCompanion.insert(
                id: Value(company.id),
                name: company.name,
                cuit: company.cuit,
              ),
            );
      }

      for (final client in catalog.clients) {
        await _db.into(_db.clients).insertOnConflictUpdate(
              ClientsCompanion.insert(
                id: Value(client.id),
                name: client.name,
              ),
            );
      }

      for (final farm in catalog.farms) {
        await _db.into(_db.farms).insertOnConflictUpdate(
              FarmsCompanion.insert(
                id: Value(farm.id),
                clientId: farm.clientId,
                name: farm.name,
                surface: farm.surface,
              ),
            );
      }

      for (final lot in catalog.lots) {
        await _db.into(_db.lots).insertOnConflictUpdate(
              LotsCompanion.insert(
                id: Value(lot.id),
                farmId: lot.farmId,
                name: lot.name,
                area: lot.area,
              ),
            );
      }

      for (final laborType in catalog.laborTypes) {
        await _db.into(_db.laborTypes).insertOnConflictUpdate(
              LaborTypesCompanion.insert(
                id: Value(laborType.id),
                name: laborType.name,
              ),
            );
      }

      for (final machine in catalog.machines) {
        await _db.into(_db.machines).insertOnConflictUpdate(
              MachinesCompanion.insert(
                id: Value(machine.id),
                companyId: machine.companyId,
                name: machine.name,
                brand: Value(machine.brand),
                status: machineStatusToText(machine.status),
              ),
            );
      }

      for (final task in catalog.tasks) {
        await _db.into(_db.tasks).insertOnConflictUpdate(
              TasksCompanion.insert(
                id: Value(task.id),
                lotId: task.lotId,
                laborTypeId: task.laborTypeId,
                status: taskStatusToText(task.status),
              ),
            );
        await (_db.delete(_db.taskOperators)
              ..where((row) => row.taskId.equals(task.id)))
            .go();
        for (final operatorId in task.operatorIds) {
          await _db.into(_db.taskOperators).insert(
                TaskOperatorsCompanion.insert(
                  taskId: task.id,
                  operatorId: operatorId,
                ),
              );
        }
      }
    });
  }
}

/// Extrae el nombre legible de una tarea a partir del catálogo cacheado.
/// Se mantiene aquí para que la UI no dependa de ids cuando hay nombres.
String taskDisplayLabel({
  required String taskId,
  String? lotName,
  String? laborTypeName,
}) {
  final parts = [
    if (laborTypeName != null && laborTypeName.trim().isNotEmpty)
      laborTypeName.trim(),
    if (lotName != null && lotName.trim().isNotEmpty) lotName.trim(),
  ];
  if (parts.isEmpty) {
    final short = taskId.length > 8 ? taskId.substring(0, 8) : taskId;
    return 'Tarea $short';
  }
  return parts.join(' · ');
}

/// Estado local de una máquina a partir del wire (compatibilidad).
String machineStatusWireToLocalText(String wire) =>
    machineStatusToText(machineStatusFromWire(wire) ?? MachineStatus.OUT_OF_SERVICE);
