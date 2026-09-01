import 'enums.dart';

/// Catálogos (solo lectura: se bajan por pull versionado, no se crean en el
/// dominio). Llevan `version` + `deleted` para la sincronización por versión.
///
/// `Recipe`/`RecipeItem` no son catálogos (pertenecen a producción), por eso
/// NO tienen `version`/`deleted`; `Recipe.status` queda como texto (valores a
/// definir con el backend).

class Company {
  const Company({
    required this.id,
    required this.name,
    required this.cuit,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String name;
  final String cuit;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Client {
  const Client({
    required this.id,
    required this.name,
    this.cuit,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String name;
  final String? cuit;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Farm {
  const Farm({
    required this.id,
    required this.clientId,
    required this.name,
    this.location,
    required this.surface,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String clientId;
  final String name;
  final String? location;
  final double surface;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Lot {
  const Lot({
    required this.id,
    required this.farmId,
    required this.name,
    this.coords,
    required this.area,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String farmId;
  final String name;
  final String? coords;
  final double area;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class LaborType {
  const LaborType({
    required this.id,
    required this.name,
    this.description,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String name;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Input {
  const Input({
    required this.id,
    required this.name,
    required this.unit,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String name;

  /// `L` | `KG` | `UNIT`.
  final String unit;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Machine {
  const Machine({
    required this.id,
    required this.companyId,
    required this.name,
    this.brand,
    required this.status,
    this.entryDate,
    this.maintenanceDate,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
    required this.deleted,
  });

  final String id;
  final String companyId;
  final String name;
  final String? brand;
  final MachineStatus status;
  final DateTime? entryDate;
  final DateTime? maintenanceDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;
  final bool deleted;
}

class Recipe {
  const Recipe({
    required this.id,
    required this.lotId,
    required this.date,
    required this.status,
    this.observations,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String lotId;
  final DateTime date;

  /// Texto libre; valores concretos a definir con el backend (no inventar).
  final String status;
  final String? observations;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class RecipeItem {
  const RecipeItem({
    required this.id,
    required this.recipeId,
    required this.inputId,
    required this.dose,
    this.unit,
    required this.loadOrder,
  });

  final String id;
  final String recipeId;
  final String inputId;
  final double dose;
  final String? unit;
  final int loadOrder;
}
