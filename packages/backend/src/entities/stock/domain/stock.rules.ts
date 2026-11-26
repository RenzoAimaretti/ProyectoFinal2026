import {
  StockBalance,
  StockBalanceStatus,
  StockBalanceSummaryData,
  StockBalanceSummaryInputRow,
  StockBalanceSummaryItem,
} from '../application/stock.types';

const BALANCE_EPSILON = 0.005;

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

export function resolveStockBalanceStatus(netVsPlanned: number): StockBalanceStatus {
  if (Math.abs(netVsPlanned) < BALANCE_EPSILON) {
    return 'OK';
  }
  return netVsPlanned < 0 ? 'FALTANTE' : 'SOBRANTE';
}

export function buildStockBalanceSummary(
  data: StockBalanceSummaryData,
): StockBalanceSummaryItem[] {
  const byInput = new Map<
    string,
    {
      inputId: string;
      inputName: string;
      unit: string;
      receivedQuantity: number;
      consumedQuantity: number;
      availableQuantity: number;
      plannedQuantity: number;
    }
  >();

  const ensure = (row: StockBalanceSummaryInputRow) => {
    let entry = byInput.get(row.inputId);
    if (!entry) {
      entry = {
        inputId: row.inputId,
        inputName: row.inputName,
        unit: row.unit,
        receivedQuantity: 0,
        consumedQuantity: 0,
        availableQuantity: 0,
        plannedQuantity: 0,
      };
      byInput.set(row.inputId, entry);
    }
    return entry;
  };

  for (const row of data.stocks) {
    ensure(row).availableQuantity += row.quantity;
  }
  for (const row of data.received) {
    ensure(row).receivedQuantity += row.quantity;
  }
  for (const row of data.consumed) {
    ensure(row).consumedQuantity += row.quantity;
  }
  for (const row of data.planned) {
    ensure(row).plannedQuantity += row.quantity;
  }

  return Array.from(byInput.values())
    .map((entry) => {
      const receivedQuantity = roundTo2(entry.receivedQuantity);
      const consumedQuantity = roundTo2(entry.consumedQuantity);
      const availableQuantity = roundTo2(entry.availableQuantity);
      const plannedQuantity = roundTo2(entry.plannedQuantity);
      const netVsPlanned = roundTo2(availableQuantity - plannedQuantity);
      return {
        inputId: entry.inputId,
        inputName: entry.inputName,
        unit: entry.unit,
        receivedQuantity,
        consumedQuantity,
        availableQuantity,
        plannedQuantity,
        netVsPlanned,
        status: resolveStockBalanceStatus(netVsPlanned),
      };
    })
    .sort((a, b) => a.inputName.localeCompare(b.inputName, 'es'));
}
