export type StockRecord = {
  id: string;
  clientId: string;
  inputId: string;
  quantity: number;
  updatedAt: Date;
};

export type StockBalance = {
  clientId: string;
  inputId: string;
  quantity: number;
};
