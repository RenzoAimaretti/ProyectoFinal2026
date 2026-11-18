import { EntityNotFoundError } from '../../domain/errors';
import { LaborTypeCategoryRepositoryPort } from '../labor-type-category.ports';

export class FindLaborTypeCategoriesUseCase {
  constructor(private readonly repository: LaborTypeCategoryRepositoryPort) {}

  async execute(id: string, tenantId: string) {
    const laborType = await this.repository.findLaborTypeForTenant(id, tenantId);
    if (!laborType) throw new EntityNotFoundError('Labor type not found');
    return this.repository.findCategoriesForLaborType(id, tenantId);
  }
}
