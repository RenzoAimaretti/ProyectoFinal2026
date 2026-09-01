import 'dart:async';

import '../../domain/models/catalogs.dart' as domain;
import '../../domain/repositories/client_reader.dart';
import '../../domain/repositories/company_reader.dart';
import '../../domain/repositories/farm_reader.dart';
import '../../domain/repositories/input_reader.dart';
import '../../domain/repositories/labor_type_reader.dart';
import '../../domain/repositories/lot_reader.dart';
import '../../domain/repositories/machine_reader.dart';
import '../../domain/repositories/recipe_reader.dart';
import '../models/catalog_mappers.dart';
import '../services/app_database.dart';

/// Lectores de catálogos en drift.
///
/// El dominio expone puertos pequeños (`watchAll`, `getById`, ...) que varios
/// lectores comparten por nombre (`watchAll`/`getById` aparecen en varios con
/// distinto tipo de retorno). Dart no permite que UNA clase implemente dos
/// interfaces con el mismo nombre de método y distinto retorno, por eso hay una
/// clase por reader (8 clases, 8 puertos). Se agrupan en un único archivo por
/// cohesión de infraestructura (design §4).

class DriftCompanyReader implements CompanyReader {
  DriftCompanyReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Company>> watchAll() => _db.companiesDao
      .watchAll()
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Company?> getById(String id) async =>
      (await _db.companiesDao.getById(id))?.toDomain();
}

class DriftClientReader implements ClientReader {
  DriftClientReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Client>> watchAll() => _db.clientsDao
      .watchAll()
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Client?> getById(String id) async =>
      (await _db.clientsDao.getById(id))?.toDomain();
}

class DriftLaborTypeReader implements LaborTypeReader {
  DriftLaborTypeReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.LaborType>> watchAll() => _db.laborTypesDao
      .watchAll()
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.LaborType?> getById(String id) async =>
      (await _db.laborTypesDao.getById(id))?.toDomain();
}

class DriftInputReader implements InputReader {
  DriftInputReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Input>> watchAll() => _db.inputsDao
      .watchAll()
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Input?> getById(String id) async =>
      (await _db.inputsDao.getById(id))?.toDomain();
}

class DriftFarmReader implements FarmReader {
  DriftFarmReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Farm>> watchByClient(String clientId) => _db.farmsDao
      .watchByClient(clientId)
      .map((rows) => rows.map((r) => r.toDomain()).toList());
}

class DriftLotReader implements LotReader {
  DriftLotReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Lot>> watchByFarm(String farmId) => _db.lotsDao
      .watchByFarm(farmId)
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Lot?> getById(String id) async =>
      (await _db.lotsDao.getById(id))?.toDomain();
}

class DriftMachineReader implements MachineReader {
  DriftMachineReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Machine>> watchByCompany(String companyId) =>
      _db.machinesDao
          .watchByCompany(companyId)
          .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Machine?> getById(String id) async =>
      (await _db.machinesDao.getById(id))?.toDomain();
}

class DriftRecipeReader implements RecipeReader {
  DriftRecipeReader(this._db);

  final AppDatabase _db;

  @override
  Stream<List<domain.Recipe>> watchByLot(String lotId) => _db.recipesDao
      .watchByLot(lotId)
      .map((rows) => rows.map((r) => r.toDomain()).toList());

  @override
  Future<domain.Recipe?> getById(String id) async =>
      (await _db.recipesDao.getById(id))?.toDomain();
}
