import { InvoiceRepositoryPort } from '../invoice.ports';
import { requiredString } from '../invoice.validation';

export class ListInvoicesUseCase {
  constructor(private readonly repository: InvoiceRepositoryPort) {}
  execute(companyId: string) {
    return this.repository.findAllByCompany(
      requiredString(companyId, 'companyId'),
    );
  }
}
