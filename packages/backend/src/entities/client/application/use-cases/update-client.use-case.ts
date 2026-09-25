import { EntityNotFoundError } from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { ClientRecord, UpdateClientInput } from '../client.types';
import {
  assertNonEmptyObject,
  assertOptionalBoolean,
  assertRequiredString,
  normalizeOptionalString,
} from '../client.validation';

export class UpdateClientUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  async execute(
    id: string,
    tenantId: string,
    data?: UpdateClientInput,
  ): Promise<ClientRecord> {
    const input = assertNonEmptyObject(data);

    const existing = await this.repository.findByIdForTenant(id, tenantId);
    if (!existing) {
      throw new EntityNotFoundError(`Client with id ${id} not found`);
    }

    const updateData: UpdateClientInput = {};

    if (input.name !== undefined) {
      updateData.name = assertRequiredString(input.name, 'name');
    }

    if (input.cuit !== undefined) {
      updateData.cuit = normalizeOptionalString(input.cuit, 'cuit');
    }

    if (input.active !== undefined) {
      updateData.active = assertOptionalBoolean(input.active, 'active');
    }

    return this.repository.updateForTenant(id, tenantId, updateData);
  }
}
