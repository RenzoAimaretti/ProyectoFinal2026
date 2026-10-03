import { EntityNotFoundError } from '../../domain/errors';
import { InputRepositoryPort } from '../input.ports';
import { InputRecord, UpdateInputInput } from '../input.types';
import {
  assertNonEmptyObject,
  assertOptionalBoolean,
  assertRequiredString,
} from '../input.validation';

export class UpdateInputUseCase {
  constructor(private readonly repository: InputRepositoryPort) {}

  async execute(
    id: string,
    tenantId: string,
    data?: UpdateInputInput,
  ): Promise<InputRecord> {
    const input = assertNonEmptyObject(data);

    const existing = await this.repository.findByIdForTenant(id, tenantId);
    if (!existing) {
      throw new EntityNotFoundError(`Input with id ${id} not found`);
    }

    const updateData: UpdateInputInput = {};

    if (input.name !== undefined) {
      updateData.name = assertRequiredString(input.name, 'name');
    }

    if (input.unit !== undefined) {
      updateData.unit = assertRequiredString(input.unit, 'unit');
    }

    if (input.active !== undefined) {
      updateData.active = assertOptionalBoolean(input.active, 'active');
    }

    return this.repository.updateForTenant(id, tenantId, updateData);
  }
}
