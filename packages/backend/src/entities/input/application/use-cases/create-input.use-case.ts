import { DuplicateEntityError } from '../../domain/errors';
import { InputRepositoryPort } from '../input.ports';
import { CreateInputInput, InputRecord } from '../input.types';
import { assertRequiredString } from '../input.validation';

export class CreateInputUseCase {
  constructor(private readonly repository: InputRepositoryPort) {}

  async execute(
    tenantId: string,
    data: CreateInputInput,
  ): Promise<InputRecord> {
    const name = assertRequiredString(data.name, 'name');
    const unit = assertRequiredString(data.unit, 'unit');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const existing = await this.repository.findByNameAndTenantId(name, tenant);
    if (existing) {
      throw new DuplicateEntityError(
        'An input with this name already exists for the tenant',
      );
    }

    return this.repository.create({ name, unit, tenantId: tenant });
  }
}
