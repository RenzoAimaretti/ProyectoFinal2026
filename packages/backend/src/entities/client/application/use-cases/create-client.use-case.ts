import { DuplicateEntityError } from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { ClientRecord, CreateClientInput } from '../client.types';
import {
  assertRequiredString,
  normalizeOptionalString,
} from '../client.validation';

export class CreateClientUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  async execute(
    tenantId: string,
    data: CreateClientInput,
  ): Promise<ClientRecord> {
    const name = assertRequiredString(data.name, 'name');
    const tenant = assertRequiredString(tenantId, 'tenantId');
    const cuit = normalizeOptionalString(data.cuit, 'cuit');

    const existing = await this.repository.findByNameAndTenantId(name, tenant);
    if (existing) {
      throw new DuplicateEntityError(
        'A client with this name already exists for the tenant',
      );
    }

    return this.repository.create({ name, cuit, tenantId: tenant });
  }
}
