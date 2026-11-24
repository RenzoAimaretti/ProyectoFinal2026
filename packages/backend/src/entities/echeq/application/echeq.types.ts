import { EcheqDirection, EcheqStatus } from '../domain/echeq.rules';

export type CreateEcheqInput = {
  code: string;
  issuer: string;
  amount: number;
  direction: EcheqDirection;
  dueDate: string;
  notes?: string | null;
  paymentId?: string | null;
};

export type CreateEcheqData = {
  companyId: string;
  paymentId: string | null;
  code: string;
  issuer: string;
  amount: number;
  direction: EcheqDirection;
  dueDate: Date;
  status: EcheqStatus;
  settlementDate: Date | null;
  notes: string | null;
};

export type EcheqRecord = CreateEcheqData & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PendingEcheq = EcheqRecord & { overdue: boolean };
