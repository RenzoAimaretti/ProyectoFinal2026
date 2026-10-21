import { EntityNotFoundError } from '../../domain/errors';
import { InputCategoryRepositoryPort } from '../input-category.ports';
export class FindInputCategoryUseCase {
  constructor(private readonly repository: InputCategoryRepositoryPort) {}
  async execute(id: string, tenantId: string) {
    const category = await this.repository.findByIdForTenant(id, tenantId);
    if (!category) throw new EntityNotFoundError('Input category not found');
    return category;
  }
}
