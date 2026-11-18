import { CHEQUE_INITIAL_STATUS } from '../../domain/cheque-status';
import { InvalidInputError } from '../../domain/errors';
import { ChequeRepositoryPort } from '../cheque.ports';
import { CreateChequeInput, ChequeRecord } from '../cheque.types';
import {
  positiveAmount,
  requiredDate,
  requiredString,
} from '../cheque.validation';

export class CreateChequeUseCase {
  constructor(private readonly repository: ChequeRepositoryPort) {}

  async execute(
    companyId: string,
    input: CreateChequeInput,
  ): Promise<ChequeRecord> {
    const company = requiredString(companyId, 'companyId');
    const number = requiredString(input.number, 'number');
    const issuer = requiredString(input.issuer, 'issuer');
    const dueDate = requiredDate(input.dueDate, 'dueDate');
    const amount = positiveAmount(input.amount);

    // The payment FK and the company FK are independent columns, so a payment
    // id taken from the body could link this cheque to another firma's payment
    // and overlap two accountings (R033). Until the payments module can resolve
    // a payment INSIDE the caller's firma, the link is refused instead of
    // silently persisted.
    if (input.paymentId != null) {
      throw new InvalidInputError(
        'paymentId cannot be linked until the payments module resolves it within the firma',
      );
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
      paymentId: null,
    });
  }
}
