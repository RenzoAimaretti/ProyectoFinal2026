import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { InputCategoryRepositoryPort } from '../input-category.ports';
import { UpdateInputCategoryInput } from '../input-category.types';
import { updatePayload } from '../input-category.validation';
export class UpdateInputCategoryUseCase {
  constructor(private readonly repository: InputCategoryRepositoryPort) {}
  async execute(id: string, tenantId: string, input: UpdateInputCategoryInput) {
    const data = updatePayload(input);
    const existing = await this.repository.findByIdForTenant(id, tenantId);
    if (!existing) throw new EntityNotFoundError('Input category not found');
    if (data.name !== undefined && data.name !== existing.name) {
      const duplicate = await this.repository.findByNameAndTenantId(data.name, tenantId);
      if (duplicate && duplicate.id !== id) throw new DuplicateEntityError('Input category already exists');
    }
    return this.repository.updateForTenant(id, tenantId, data);
  }
}
