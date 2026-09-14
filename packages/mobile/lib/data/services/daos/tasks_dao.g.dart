// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tasks_dao.dart';

// ignore_for_file: type=lint
mixin _$TasksDaoMixin on DatabaseAccessor<AppDatabase> {
  $ClientsTable get clients => attachedDatabase.clients;
  $FarmsTable get farms => attachedDatabase.farms;
  $LotsTable get lots => attachedDatabase.lots;
  $LaborTypesTable get laborTypes => attachedDatabase.laborTypes;
  $TasksTable get tasks => attachedDatabase.tasks;
  $TaskOperatorsTable get taskOperators => attachedDatabase.taskOperators;
  TasksDaoManager get managers => TasksDaoManager(this);
}

class TasksDaoManager {
  final _$TasksDaoMixin _db;
  TasksDaoManager(this._db);
  $$ClientsTableTableManager get clients =>
      $$ClientsTableTableManager(_db.attachedDatabase, _db.clients);
  $$FarmsTableTableManager get farms =>
      $$FarmsTableTableManager(_db.attachedDatabase, _db.farms);
  $$LotsTableTableManager get lots =>
      $$LotsTableTableManager(_db.attachedDatabase, _db.lots);
  $$LaborTypesTableTableManager get laborTypes =>
      $$LaborTypesTableTableManager(_db.attachedDatabase, _db.laborTypes);
  $$TasksTableTableManager get tasks =>
      $$TasksTableTableManager(_db.attachedDatabase, _db.tasks);
  $$TaskOperatorsTableTableManager get taskOperators =>
      $$TaskOperatorsTableTableManager(_db.attachedDatabase, _db.taskOperators);
}
