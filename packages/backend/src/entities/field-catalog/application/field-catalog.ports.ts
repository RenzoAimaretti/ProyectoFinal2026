export const FIELD_CATALOG_REPOSITORY = Symbol('FIELD_CATALOG_REPOSITORY');

export type FieldCatalogCompany = { id: string; name: string; cuit: string };
export type FieldCatalogClient = { id: string; name: string };
export type FieldCatalogFarm = {
  id: string;
  clientId: string;
  name: string;
  surface: number;
};
export type FieldCatalogLot = {
  id: string;
  farmId: string;
  name: string;
  area: number;
};
export type FieldCatalogLaborType = { id: string; name: string };
export type FieldCatalogMachine = {
  id: string;
  companyId: string;
  name: string;
  brand: string | null;
  status: 'ACTIVA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
};
export type FieldCatalogTask = {
  id: string;
  lotId: string;
  laborTypeId: string;
  status: 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADA' | 'CANCELADA';
  operators: { id: string }[];
};

export type FieldCatalogInputCategory = {
  id: string;
  name: string;
  active: boolean;
};
export type FieldCatalogInput = {
  id: string;
  name: string;
  unit: 'L' | 'KG' | 'UNIT';
  categoryId: string;
  active: boolean;
};
export type FieldCatalogLaborTypeCategory = {
  laborTypeId: string;
  categoryId: string;
};
export type FieldCatalogRecipeItem = {
  id: string;
  inputId: string;
  dose: number;
  unit: string | null;
  loadOrder: number;
};
export type FieldCatalogRecipe = {
  id: string;
  lotId: string;
  date: Date;
  observations: string | null;
  items: FieldCatalogRecipeItem[];
};

/// Catalog needed by the mobile field flow (CUU05, CUU08).
///
/// It is a full snapshot: the mobile app treats it as authoritative, so every
/// collection excludes deleted rows and rows whose parent is deleted. Recipes
/// are the active ones (R009 needs one per lot to enable a daily report).
///
/// Only the caller's firma is exposed, so an OPERARIO can cache the company row
/// its machines reference without widening any existing endpoint.
export type FieldCatalog = {
  companies: FieldCatalogCompany[];
  clients: FieldCatalogClient[];
  farms: FieldCatalogFarm[];
  lots: FieldCatalogLot[];
  laborTypes: FieldCatalogLaborType[];
  machines: FieldCatalogMachine[];
  tasks: FieldCatalogTask[];
  inputCategories: FieldCatalogInputCategory[];
  inputs: FieldCatalogInput[];
  laborTypeCategories: FieldCatalogLaborTypeCategory[];
  recipes: FieldCatalogRecipe[];
};

export type FieldCatalogScope = {
  tenantId: string;
  companyId: string;
};

export interface FieldCatalogRepositoryPort {
  findCatalog(scope: FieldCatalogScope): Promise<FieldCatalog>;
}
