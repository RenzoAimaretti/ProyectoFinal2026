import { PaymentRepositoryPort } from '../payment.ports';
import { PaymentKind, PaymentRecord } from '../payment.types';
import { paymentKind, requiredString } from '../payment.validation';

export class ListPaymentsUseCase {
  constructor(private readonly repository: PaymentRepositoryPort) {}

  async execute(
    companyId: string,
    kind?: PaymentKind,
  ): Promise<PaymentRecord[]> {
    return this.repository.findAllByCompany(
      requiredString(companyId, 'companyId'),
      kind === undefined ? undefined : paymentKind(kind),
    );
  }
}
