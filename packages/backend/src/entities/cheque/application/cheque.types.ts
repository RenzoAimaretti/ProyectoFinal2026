import { ChequeStatus } from '../domain/cheque-status';

export type CreateChequeInput = {
  number: string;
  issuer: string;
  dueDate: string;
  amount: number;
  bank?: string | null;
  notes?: string | null;
  // Payment linkage is accepted but not checked: the payment module (T3) does not exist yet.
  paymentId?: string | null;
};

export type CreateChequeData = {
  companyId: string;
  paymentId: string | null;
  number: string;
  issuer: string;
  bank: string | null;
  amount: number;
  dueDate: Date;
  status: ChequeStatus;
  notes: string | null;
};

export type ChequeRecord = CreateChequeData & {
  id: string;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
