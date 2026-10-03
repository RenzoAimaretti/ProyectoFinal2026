import { EntityNotFoundError } from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { ClientProfileRecord } from '../client.types';
import { assertRequiredString } from '../client.validation';

export class FindClientProfileUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  async execute(userId: string): Promise<ClientProfileRecord> {
    const id = assertRequiredString(userId, 'userId');
    const profile = await this.repository.findProfileByUserId(id);

    if (!profile) {
      throw new EntityNotFoundError(
        'The authenticated user is not linked to a client',
      );
    }

    return profile;
  }
}
