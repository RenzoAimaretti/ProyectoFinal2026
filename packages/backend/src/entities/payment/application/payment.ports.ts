import {
  CreatePaymentData,
  InvoiceScope,
  PaymentKind,
  PaymentRecord,
} from './payment.types';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export interface PaymentRepositoryPort {
  createAndSettle(data: CreatePaymentData): Promise<PaymentRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<PaymentRecord | null>;
  findAllByCompany(
    companyId: string,
    kind?: PaymentKind,
  ): Promise<PaymentRecord[]>;
}

export const PAYMENT_INVOICE_READER = Symbol('PAYMENT_INVOICE_READER');
export interface PaymentInvoiceReaderPort {
  findForCompany(id: string, companyId: string): Promise<InvoiceScope | null>;
}

export const PAYMENT_TENANT_READER = Symbol('PAYMENT_TENANT_READER');
export interface PaymentTenantReaderPort {
  findCompanyTenantId(companyId: string): Promise<string | null>;
  findClientTenantId(clientId: string): Promise<string | null>;
}
