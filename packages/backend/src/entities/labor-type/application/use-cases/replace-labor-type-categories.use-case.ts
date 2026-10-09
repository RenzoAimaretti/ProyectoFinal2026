import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { LaborTypeCategoryRepositoryPort, LaborTypeInputCategoryReaderPort } from '../labor-type-category.ports';

export class ReplaceLaborTypeCategoriesUseCase {
  constructor(
    private readonly repository: LaborTypeCategoryRepositoryPort,
    private readonly categoryReader: LaborTypeInputCategoryReaderPort,
  ) {}

  async execute(id: string, tenantId: string, input: { categoryIds: string[] }) {
    const laborType = await this.repository.findLaborTypeForTenant(id, tenantId);
    if (!laborType) throw new EntityNotFoundError('Labor type not found');
    if (!input || !Array.isArray(input.categoryIds) || input.categoryIds.some((value) => typeof value !== 'string' || !value)) {
      throw new InvalidInputError('categoryIds must be an array of non-empty strings');
    }
    const ids = [...new Set(input.categoryIds)];
    if (ids.length) {
      const categories = await this.categoryReader.findByIdsForTenant(ids, tenantId);
      if (categories.length !== ids.length) throw new EntityNotFoundError('Input category not found');
    }
    await this.repository.replaceCategoriesForTenant(id, tenantId, ids);
    return this.repository.findCategoriesForLaborType(id, tenantId);
  }
}
