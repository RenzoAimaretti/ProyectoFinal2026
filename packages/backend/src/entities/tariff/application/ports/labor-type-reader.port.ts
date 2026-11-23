export const LABOR_TYPE_READER = Symbol('LABOR_TYPE_READER');

export interface LaborTypeSummary {
  id: string;
  name: string;
}

export interface LaborTypeReaderPort {
  /** Tipo de labor del tenant del caller que no fue dado de baja; `null` si no existe. */
  findActiveInTenant(
    laborTypeId: string,
    tenantId: string,
  ): Promise<LaborTypeSummary | null>;
}
