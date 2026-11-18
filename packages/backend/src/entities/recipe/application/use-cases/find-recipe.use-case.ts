import { EntityNotFoundError } from '../../domain/errors';
import { RecipeRepositoryPort } from '../recipe.ports';
import { RecipeOutput } from '../recipe.types';
import { withPrescriptionTotals } from '../recipe.totals';
import { assertRequiredString } from '../recipe.validation';

export class FindRecipeUseCase {
  constructor(private readonly repository: RecipeRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<RecipeOutput> {
    const recipeId = assertRequiredString(id, 'id');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const recipe = await this.repository.findByIdForTenant(recipeId, tenant);

    if (!recipe) {
      throw new EntityNotFoundError(`Recipe with id ${recipeId} not found`);
    }

    // R5/R8: the totals are strictly additive enrichment. When the lot surface
    // is unknown the stored recipe is returned unchanged.
    return withPrescriptionTotals(recipe, recipe.lotArea);
  }
}
