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

/// Catalog needed by the mobile field flow (CUU08).
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
};

export type FieldCatalogScope = {
  tenantId: string;
  companyId: string;
};

export interface FieldCatalogRepositoryPort {
  findCatalog(scope: FieldCatalogScope): Promise<FieldCatalog>;
}
