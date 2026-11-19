import 'enums.dart';

typedef CatalogCompany = ({String id, String name, String cuit});
typedef CatalogClient = ({String id, String name});
typedef CatalogFarm = ({
  String id,
  String clientId,
  String name,
  double surface,
});
typedef CatalogLot = ({String id, String farmId, String name, double area});
typedef CatalogLaborType = ({String id, String name});
typedef CatalogMachine = ({
  String id,
  String companyId,
  String name,
  String? brand,
  MachineStatus status,
});
typedef CatalogTask = ({
  String id,
  String lotId,
  String laborTypeId,
  TaskStatus status,
  List<String> operatorIds,
});
typedef CatalogInputCategory = ({String id, String name, bool active});
typedef CatalogInput = ({
  String id,
  String name,
  String unit,
  String categoryId,
  bool active,
});
typedef CatalogLaborTypeCategory = ({String laborTypeId, String categoryId});
typedef CatalogRecipeItem = ({
  String id,
  String inputId,
  double dose,
  String? unit,
  int loadOrder,
});
typedef CatalogRecipe = ({
  String id,
  String lotId,
  DateTime date,
  String? observations,
  List<CatalogRecipeItem> items,
});

/// Catálogo de campo que el móvil cachea para operar offline.
///
/// Es una foto completa y autoritativa del backend (`GET /catalog/field`): la
/// caché local se reconcilia contra ella, así que lo que no viene se retira.
class FieldCatalog {
  const FieldCatalog({
    required this.companies,
    required this.clients,
    required this.farms,
    required this.lots,
    required this.laborTypes,
    required this.machines,
    required this.tasks,
    this.inputCategories = const [],
    this.inputs = const [],
    this.laborTypeCategories = const [],
    this.recipes = const [],
  });

  final List<CatalogCompany> companies;
  final List<CatalogClient> clients;
  final List<CatalogFarm> farms;
  final List<CatalogLot> lots;
  final List<CatalogLaborType> laborTypes;
  final List<CatalogMachine> machines;
  final List<CatalogTask> tasks;
  final List<CatalogInputCategory> inputCategories;
  final List<CatalogInput> inputs;
  final List<CatalogLaborTypeCategory> laborTypeCategories;
  final List<CatalogRecipe> recipes;

  bool get isEmpty => tasks.isEmpty && machines.isEmpty;

  int get rowCount =>
      companies.length +
      clients.length +
      farms.length +
      lots.length +
      laborTypes.length +
      machines.length +
      tasks.length +
      inputCategories.length +
      inputs.length +
      laborTypeCategories.length +
      recipes.length;
}
