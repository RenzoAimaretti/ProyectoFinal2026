import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { InputCategoryReaderPort, InputRepositoryPort } from '../input.ports';
import { CreateInputInput, InputRecord } from '../input.types';
import { assertInputUnit, assertRequiredString } from '../input.validation';

export class CreateInputUseCase {
  constructor(private readonly repository: InputRepositoryPort, private readonly categories: InputCategoryReaderPort) {}

  async execute(
    tenantId: string,
    data: CreateInputInput,
  ): Promise<InputRecord> {
    const name = assertRequiredString(data.name, 'name');
    const unit = assertInputUnit(data.unit);
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const categoryId = assertRequiredString(data.categoryId, 'categoryId');
    if (!await this.categories.findByIdForTenant(categoryId, tenant)) {
      throw new EntityNotFoundError(`Input category with id ${categoryId} not found`);
    }

    const existing = await this.repository.findByNameAndTenantId(name, tenant);
    if (existing) {
      throw new DuplicateEntityError(
        'An input with this name already exists for the tenant',
      );
    }

    return this.repository.create({ name, unit, tenantId: tenant, categoryId });
  }
}
