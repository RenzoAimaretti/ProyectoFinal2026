export type StockRecord = {
  id: string;
  clientId: string;
  inputId: string;
  quantity: number;
  updatedAt: Date;
  /** Additive read enrichment: catalogue name of the input. */
  inputName?: string;
  /** Additive read enrichment: catalogue unit of the input. */
  unit?: string;
};

export type StockBalance = {
  clientId: string;
  inputId: string;
  quantity: number;
};
