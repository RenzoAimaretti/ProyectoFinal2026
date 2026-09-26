import { EntityNotFoundError } from '../../domain/errors';
import {
  assertPendingValidation,
  assertRejectionReason,
} from '../../domain/reception.rules';
import {
  ReceptionRepositoryPort,
  ReceptionValidationPort,
} from '../reception.ports';
import { ReceptionRecord } from '../reception.types';
import { assertRequiredString } from '../reception.validation';

export class RejectReceptionUseCase {
  constructor(
    private readonly repository: ReceptionRepositoryPort,
    private readonly validation: ReceptionValidationPort,
  ) {}

  async execute(
    clientId: string,
    receptionId: string,
    rejectionReason: string,
  ): Promise<ReceptionRecord> {
    const client = assertRequiredString(clientId, 'clientId');
    const id = assertRequiredString(receptionId, 'id');
    const reason = assertRejectionReason(rejectionReason);

    const reception = await this.repository.findByIdForClient(id, client);
    if (!reception) {
      throw new EntityNotFoundError(`Reception with id ${id} not found`);
    }

    assertPendingValidation(reception);

    return this.validation.reject({
      id: reception.id,
      clientId: reception.clientId,
      rejectionReason: reason,
    });
  }
}
