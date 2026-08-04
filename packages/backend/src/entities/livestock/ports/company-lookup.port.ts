// Puerto de capacidad angosto (D1 Option A): solo la verificación de existencia
// que el servicio necesita. El adapter de F2/W1 (company) podrá reemplazarlo por
// COMPANY_REPOSITORY exportado por el dueño (T-F2-23).

export const COMPANY_LOOKUP = Symbol('COMPANY_LOOKUP');

export interface CompanyLookupPort {
  companyExists(id: string): Promise<boolean>;
}
