import { RecipeRepositoryPort } from '../recipe.ports';
import { RecipeRecord } from '../recipe.types';
import { assertRequiredString } from '../recipe.validation';

export class FindRecipesByLotUseCase {
  constructor(private readonly repository: RecipeRepositoryPort) {}

  async execute(lotId: string, tenantId: string): Promise<RecipeRecord[]> {
    const lot = assertRequiredString(lotId, 'lotId');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    return this.repository.findAllByLotForTenant(lot, tenant);
  }
}
