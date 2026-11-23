import { isEcheqDirection } from '../../domain/echeq.rules';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import { EcheqPaymentReaderPort, EcheqRepositoryPort } from '../echeq.ports';
import { CreateEcheqInput, EcheqRecord } from '../echeq.types';
import {
  positiveAmount,
  requiredDate,
  requiredString,
} from '../echeq.validation';

export class CreateEcheqUseCase {
  constructor(
    private readonly repository: EcheqRepositoryPort,
    private readonly payments: EcheqPaymentReaderPort,
  ) {}

  async execute(
    companyId: string,
    input: CreateEcheqInput,
  ): Promise<EcheqRecord> {
    const company = requiredString(companyId, 'companyId');
    const code = requiredString(input.code, 'code');
    const issuer = requiredString(input.issuer, 'issuer');
    const dueDate = requiredDate(input.dueDate, 'dueDate');
    const amount = positiveAmount(input.amount);
    if (!isEcheqDirection(input.direction))
      throw new InvalidInputError('direction must be a valid eCheq direction');
    if (input.paymentId != null) {
      const method = await this.payments.findMethodForCompany(
        input.paymentId,
        company,
      );
      if (method == null) throw new EntityNotFoundError('Payment not found');
      // An eCheq must not be reconciled against a payment made by another method.
      if (method !== 'ECHEQ')
        throw new InvalidRelationError('Payment method must be ECHEQ');
    }
    return this.repository.create({
      companyId: company,
      paymentId: input.paymentId ?? null,
      code,
      issuer,
      dueDate,
      amount,
      direction: input.direction,
      status: 'PENDIENTE',
      settlementDate: null,
      notes: input.notes ?? null,
    });
  }
}
