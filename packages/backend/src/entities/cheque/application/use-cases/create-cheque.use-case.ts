import { CHEQUE_INITIAL_STATUS } from '../../domain/cheque-status';
import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
import { ChequePaymentReaderPort, ChequeRepositoryPort } from '../cheque.ports';
import { CreateChequeInput, ChequeRecord } from '../cheque.types';
import {
  positiveAmount,
  requiredDate,
  requiredString,
} from '../cheque.validation';

export class CreateChequeUseCase {
  constructor(
    private readonly repository: ChequeRepositoryPort,
    private readonly payments: ChequePaymentReaderPort,
  ) {}

  async execute(
    companyId: string,
    input: CreateChequeInput,
  ): Promise<ChequeRecord> {
    const company = requiredString(companyId, 'companyId');
    const number = requiredString(input.number, 'number');
    const issuer = requiredString(input.issuer, 'issuer');
    const dueDate = requiredDate(input.dueDate, 'dueDate');
    const amount = positiveAmount(input.amount);

    if (input.paymentId != null) {
      const method = await this.payments.findMethodForCompany(
        input.paymentId,
        company,
      );
      if (method == null) throw new EntityNotFoundError('Payment not found');
      // A physical cheque must not be recorded against a payment made by another method.
      if (method !== 'CHEQUE')
        throw new InvalidRelationError('Payment method must be CHEQUE');
    }

    return await this.repository.create({
      companyId: company,
      number,
      issuer,
      dueDate,
      amount,
      status: CHEQUE_INITIAL_STATUS,
      bank: input.bank == null ? null : requiredString(input.bank, 'bank'),
      notes: input.notes ?? null,
      paymentId: input.paymentId ?? null,
    });
  }
}
