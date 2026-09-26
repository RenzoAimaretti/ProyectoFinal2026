import { StockBalance } from '../application/stock.types';

/**
 * Stock is attributed to the client at global level (the sum for every lot he
 * owns), so the balance is always resolved by `{ clientId, inputId }` and never
 * partitioned by the firm that consumed it (CUU06/CUU07).
 *
 * A missing row means the client never received that input, which is a real
 * zero balance and not an error.
 */
export function resolveStockBalance(
  clientId: string,
  inputId: string,
  quantity: number | null,
): StockBalance {
  return {
    clientId,
    inputId,
    quantity: quantity ?? 0,
  };
}
