import { StockBalanceSummaryData, StockRecord } from './stock.types';

export const STOCK_REPOSITORY = Symbol('STOCK_REPOSITORY');
export const STOCK_BALANCE_SUMMARY_READER = Symbol('STOCK_BALANCE_SUMMARY_READER');

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

/**
 * Read capability aggregating a client's validated receptions, approved
 * daily-report consumption, current stock, and active recipe plans.
 */
export interface StockBalanceSummaryReaderPort {
  readClientSummaryData(clientId: string): Promise<StockBalanceSummaryData>;
}
