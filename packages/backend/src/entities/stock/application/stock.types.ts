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
