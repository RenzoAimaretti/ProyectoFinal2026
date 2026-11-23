export const PAYMENT_KINDS = ['FACTURADO', 'INFORMAL'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export const PAYMENT_METHODS = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'CHEQUE',
  'ECHEQ',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type CreatePaymentInput = {
  clientId: string;
  invoiceId?: string | null;
  kind: PaymentKind;
  method: PaymentMethod;
  amount: number;
  date: string;
  notes?: string | null;
};

export type CreatePaymentData = {
  companyId: string;
  clientId: string;
  invoiceId: string | null;
  kind: PaymentKind;
  method: PaymentMethod;
  amount: number;
  date: Date;
  notes: string | null;
  usdRate: number | null;
  usdRateDate: Date | null;
};

export type PaymentRecord = CreatePaymentData & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceScope = {
  clientId: string;
  status: 'EMITIDA' | 'COBRADA' | 'ANULADA';
};
