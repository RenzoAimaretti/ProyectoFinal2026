import { StockRecord } from './stock.types';

export const STOCK_REPOSITORY = Symbol('STOCK_REPOSITORY');

/**
 * Read capability over the client-scoped stock balance. Mutations are owned by
 * the workflow transactions that must stay atomic with their aggregate state:
 * reception validation enters stock and daily report approval consumes it.
 */
export interface StockRepositoryPort {
  findAllByClient(clientId: string): Promise<StockRecord[]>;
  findByClientAndInput(
    clientId: string,
    inputId: string,
  ): Promise<StockRecord | null>;
}
