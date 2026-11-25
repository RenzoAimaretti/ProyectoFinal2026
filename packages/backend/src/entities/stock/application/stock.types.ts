export type StockRecord = {
  id: string;
  clientId: string;
  inputId: string;
  quantity: number;
  updatedAt: Date;
  /** Additive read enrichment: catalogue name of the input. */
  inputName?: string;
  /**
   * The stock row's own unit snapshot. It is denominated at write time from the
   * catalogue and kept equal to the catalogue for non-zero balances by the
   * input unit-change guard.
   */
  unit?: string;
};

export type StockBalance = {
  clientId: string;
  inputId: string;
  quantity: number;
};

export type StockBalanceStatus = 'FALTANTE' | 'OK' | 'SOBRANTE';

export type StockBalanceSummaryItem = {
  inputId: string;
  inputName: string;
  unit: string;
  receivedQuantity: number;
  consumedQuantity: number;
  availableQuantity: number;
  plannedQuantity: number;
  netVsPlanned: number;
  status: StockBalanceStatus;
};

export type StockBalanceSummaryInputRow = {
  inputId: string;
  inputName: string;
  unit: string;
  quantity: number;
};

export type StockBalanceSummaryData = {
  stocks: StockBalanceSummaryInputRow[];
  received: StockBalanceSummaryInputRow[];
  consumed: StockBalanceSummaryInputRow[];
  planned: StockBalanceSummaryInputRow[];
};
