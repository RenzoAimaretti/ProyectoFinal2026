import { isEcheqDirection } from '../../domain/echeq.rules';
import { InvalidInputError } from '../../domain/errors';
import { EcheqRepositoryPort } from '../echeq.ports';
import { CreateEcheqInput, EcheqRecord } from '../echeq.types';
import {
  positiveAmount,
  requiredDate,
  requiredString,
} from '../echeq.validation';

export class CreateEcheqUseCase {
  constructor(private readonly repository: EcheqRepositoryPort) {}

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
    // Independent payment and company FKs could link another firma's payment.
    // Refuse the link until the payments module resolves it within the caller's firma.
    if (input.paymentId != null)
      throw new InvalidInputError(
        'paymentId cannot be linked until the payments module resolves it within the firma',
      );
    return this.repository.create({
      companyId: company,
      paymentId: null,
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
