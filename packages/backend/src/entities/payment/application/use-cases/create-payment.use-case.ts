import { GetUsdOfficialUseCase } from '../../../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  PaymentInvoiceReaderPort,
  PaymentRepositoryPort,
  PaymentTenantReaderPort,
} from '../payment.ports';
import { CreatePaymentInput, PaymentRecord } from '../payment.types';
import {
  paymentKind,
  paymentMethod,
  positiveAmount,
  requiredDate,
  requiredString,
} from '../payment.validation';

export class CreatePaymentUseCase {
  constructor(
    private readonly repository: PaymentRepositoryPort,
    private readonly invoices: PaymentInvoiceReaderPort,
    private readonly tenants: PaymentTenantReaderPort,
    private readonly rates: GetUsdOfficialUseCase,
  ) {}

  async execute(
    companyId: string,
    tenantId: string,
    input: CreatePaymentInput,
  ): Promise<PaymentRecord> {
    const company = requiredString(companyId, 'companyId');
    const tenant = requiredString(tenantId, 'tenantId');
    const clientId = requiredString(input?.clientId, 'clientId');
    const kind = paymentKind(input.kind);
    const method = paymentMethod(input.method);
    const amount = positiveAmount(input.amount);
    const date = requiredDate(input.date);
    const invoiceId =
      input.invoiceId == null
        ? null
        : requiredString(input.invoiceId, 'invoiceId');
    if (kind === 'FACTURADO' && !invoiceId)
      throw new InvalidInputError('FACTURADO requires invoiceId');
    if (kind === 'INFORMAL' && invoiceId)
      throw new InvalidInputError('INFORMAL cannot reference an invoice');

    if (
      (await this.tenants.findCompanyTenantId(company)) !== tenant ||
      (await this.tenants.findClientTenantId(clientId)) !== tenant
    )
      throw new InvalidRelationError(
        'Company and client must belong to the caller tenant',
      );

    if (invoiceId) {
      const invoice = await this.invoices.findForCompany(invoiceId, company);
      if (!invoice) throw new EntityNotFoundError('Invoice not found');
      if (invoice.status === 'ANULADA')
        throw new InvalidInputError('Cannot pay an annulled invoice');
      if (invoice.clientId !== clientId)
        throw new InvalidRelationError(
          'Invoice must belong to the payment client',
        );
    }

    let usdRate: number | null = null;
    let usdRateDate: Date | null = null;
    try {
      // The integration use case owns caching and stale-rate fallback; never contact the provider directly.
      const quote = await this.rates.execute();
      const quoteDate = new Date(quote.fechaActualizacion);
      // `stale` means the provider failed and the integration served its cache.
      // A previous day's quote is not "the day's rate" (R030), so it is dropped
      // instead of being persisted as if it belonged to this operation.
      if (
        !quote.stale &&
        Number.isFinite(quote.venta) &&
        quote.venta > 0 &&
        !Number.isNaN(quoteDate.getTime())
      ) {
        usdRate = quote.venta;
        usdRateDate = quoteDate;
      }
    } catch {
      // A third-party outage must not lose a payment: nulls expose the missing quote for later reconciliation.
    }

    return this.repository.createAndSettle({
      companyId: company,
      clientId,
      invoiceId,
      kind,
      method,
      amount,
      date,
      notes: input.notes ?? null,
      usdRate,
      usdRateDate,
    });
  }
}
