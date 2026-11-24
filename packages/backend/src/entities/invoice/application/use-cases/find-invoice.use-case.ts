import { EntityNotFoundError } from '../../domain/errors';
import { InvoiceRepositoryPort } from '../invoice.ports';
import { requiredString } from '../invoice.validation';

export class FindInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepositoryPort) {}
  async execute(id: string, companyId: string) {
    const invoiceId = requiredString(id, 'id');
    const company = requiredString(companyId, 'companyId');
    const invoice = await this.repository.findByIdForCompany(
      invoiceId,
      company,
    );
    if (!invoice)
      throw new EntityNotFoundError(`Invoice with id ${invoiceId} not found`);
    return invoice;
  }
}
