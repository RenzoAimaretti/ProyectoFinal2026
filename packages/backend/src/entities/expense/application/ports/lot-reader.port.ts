export const LOT_READER = Symbol('EXPENSE_LOT_READER');

export interface LotReaderPort {
  /**
   * El lote solo existe si pertenece al tenant del caller
   * (lote -> campo -> cliente -> tenantId) y no esta borrado.
   */
  findInTenant(lotId: string, tenantId: string): Promise<{ id: string } | null>;
}
