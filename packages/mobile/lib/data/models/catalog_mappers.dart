import '../../domain/models/catalogs.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Mappers fila drift → modelo de dominio para los catálogos y recetas.
///
/// Los catálogos son de SOLO LECTURA en el móvil (se bajan por pull versionado
/// en Sprint 2), por lo que solo se provee `toDomain()`; no hay `fromDomain`.

extension CompanyRowMapper on Company {
  domain.Company toDomain() => domain.Company(
        id: id,
        name: name,
        cuit: cuit,
        active: active,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension ClientRowMapper on Client {
  domain.Client toDomain() => domain.Client(
        id: id,
        name: name,
        cuit: cuit,
        active: active,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension FarmRowMapper on Farm {
  domain.Farm toDomain() => domain.Farm(
        id: id,
        clientId: clientId,
        name: name,
        location: location,
        surface: surface,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension LotRowMapper on Lot {
  domain.Lot toDomain() => domain.Lot(
        id: id,
        farmId: farmId,
        name: name,
        coords: coords,
        area: area,
        active: active,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension LaborTypeRowMapper on LaborType {
  domain.LaborType toDomain() => domain.LaborType(
        id: id,
        name: name,
        description: description,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension InputRowMapper on Input {
  domain.Input toDomain() => domain.Input(
        id: id,
        name: name,
        unit: unit,
        active: active,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension MachineRowMapper on Machine {
  domain.Machine toDomain() => domain.Machine(
        id: id,
        companyId: companyId,
        name: name,
        brand: brand,
        status: machineStatusFromText(status),
        entryDate: entryDate,
        maintenanceDate: maintenanceDate,
        createdAt: createdAt,
        updatedAt: updatedAt,
        version: version,
        deleted: deleted,
      );
}

extension RecipeRowMapper on Recipe {
  domain.Recipe toDomain() => domain.Recipe(
        id: id,
        lotId: lotId,
        date: date,
        status: status,
        observations: observations,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

extension RecipeItemRowMapper on RecipeItem {
  domain.RecipeItem toDomain() => domain.RecipeItem(
        id: id,
        recipeId: recipeId,
        inputId: inputId,
        dose: dose,
        unit: unit,
        loadOrder: loadOrder,
      );
}
