import { EntityNotFoundError } from '../../domain/errors';
import { ReceptionRepositoryPort } from '../reception.ports';
import { ReceptionRecord } from '../reception.types';
import { assertRequiredString } from '../reception.validation';

export class FindReceptionUseCase {
  constructor(private readonly repository: ReceptionRepositoryPort) {}

  async execute(clientId: string, id: string): Promise<ReceptionRecord> {
    const client = assertRequiredString(clientId, 'clientId');
    const receptionId = assertRequiredString(id, 'id');

    const reception = await this.repository.findByIdForClient(
      receptionId,
      client,
    );

    if (!reception) {
      throw new EntityNotFoundError(
        `Reception with id ${receptionId} not found`,
      );
    }

    return reception;
  }
}
