import { InvoiceStatus } from '../domain/invoice-status';
import { CalculatedItem, PricedItem } from '../domain/invoice.rules';

export type CreateInvoiceInput = {
  clientId: string;
  number: string;
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  items: PricedItem[];
};
export type CreateInvoiceData = {
  companyId: string;
  clientId: string;
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  notes: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  items: CalculatedItem[];
};
export type InvoiceRecord = Omit<CreateInvoiceData, 'items'> & {
  id: string;
  usdRate: number | null;
  usdRateDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
  items: (Omit<CalculatedItem, 'taskId'> & {
    id: string;
    invoiceId: string;
    taskId: string | null;
  })[];
};
