import { ClientRepositoryPort } from '../client.ports';
import { ClientRecord } from '../client.types';

export class FindAllClientsUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  execute(tenantId: string): Promise<ClientRecord[]> {
    return this.repository.findAllByTenantId(tenantId);
  }
}
