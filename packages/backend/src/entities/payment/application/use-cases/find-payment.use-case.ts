import { EntityNotFoundError } from '../../domain/errors';
import { PaymentRepositoryPort } from '../payment.ports';
import { PaymentRecord } from '../payment.types';
import { requiredString } from '../payment.validation';

export class FindPaymentUseCase {
  constructor(private readonly repository: PaymentRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<PaymentRecord> {
    const row = await this.repository.findByIdForCompany(
      requiredString(id, 'id'),
      requiredString(companyId, 'companyId'),
    );
    if (!row) throw new EntityNotFoundError('Payment not found');
    return row;
  }
}
