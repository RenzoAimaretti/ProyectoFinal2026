import {
  assertPendingValidation,
  assertValidationCoversItems,
} from '../../domain/reception.rules';
import { EntityNotFoundError } from '../../domain/errors';
import {
  ClockPort,
  ReceptionRepositoryPort,
  ReceptionValidationPort,
} from '../reception.ports';
import { ReceptionItemValidation, ReceptionRecord } from '../reception.types';
import {
  assertRequiredString,
  normalizeValidatedItems,
} from '../reception.validation';

export class ValidateReceptionUseCase {
  constructor(
    private readonly repository: ReceptionRepositoryPort,
    private readonly validation: ReceptionValidationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    clientId: string,
    receptionId: string,
    validatedBy: string,
    items: ReceptionItemValidation[],
  ): Promise<ReceptionRecord> {
    const client = assertRequiredString(clientId, 'clientId');
    const id = assertRequiredString(receptionId, 'id');
    const validator = assertRequiredString(validatedBy, 'validatedBy');
    const validatedItems = normalizeValidatedItems(items);

    const reception = await this.repository.findByIdForClient(id, client);
    if (!reception) {
      throw new EntityNotFoundError(`Reception with id ${id} not found`);
    }

    assertPendingValidation(reception);
    assertValidationCoversItems(reception.items, validatedItems);

    return this.validation.validateWithStock({
      id: reception.id,
      clientId: reception.clientId,
      validatedBy: validator,
      validatedAt: this.clock.now(),
      items: validatedItems,
    });
  }
}
