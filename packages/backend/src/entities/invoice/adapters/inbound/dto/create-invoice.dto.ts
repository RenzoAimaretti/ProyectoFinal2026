import { CreateInvoiceInput } from '../../../application/invoice.types';

// Protocol shape: companyId, totalAmount, status and amounts are deliberately not accepted.
export type CreateInvoiceDto = CreateInvoiceInput;
