import { EntityNotFoundError } from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { ClientRecord } from '../client.types';

export class FindClientUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<ClientRecord> {
    const client = await this.repository.findByIdForTenant(id, tenantId);

    if (!client) {
      throw new EntityNotFoundError(`Client with id ${id} not found`);
    }

    return client;
  }
}
