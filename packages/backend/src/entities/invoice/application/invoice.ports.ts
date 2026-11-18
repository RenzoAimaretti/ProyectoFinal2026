import { CreateInvoiceData, InvoiceRecord } from './invoice.types';

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
export const INVOICE_COMPANY_READER = Symbol('INVOICE_COMPANY_READER');
export const INVOICE_CLIENT_READER = Symbol('INVOICE_CLIENT_READER');
export const INVOICE_TASK_READER = Symbol('INVOICE_TASK_READER');
export const INVOICE_CLOCK = Symbol('INVOICE_CLOCK');

export interface InvoiceRepositoryPort {
  create(data: CreateInvoiceData): Promise<InvoiceRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<InvoiceRecord | null>;
  findAllByCompany(companyId: string): Promise<InvoiceRecord[]>;
}
export interface InvoiceCompanyReaderPort {
  findTenantId(id: string): Promise<string | null>;
}
export interface InvoiceClientReaderPort {
  findTenantId(id: string): Promise<string | null>;
}
export interface InvoiceTaskReaderPort {
  findClientScope(
    id: string,
  ): Promise<{ clientId: string; tenantId: string } | null>;
}
export interface InvoiceClockPort {
  now(): Date;
}
