import { EntityNotFoundError } from '../../domain/errors';
import { RecipeRepositoryPort } from '../recipe.ports';
import { RecipeRecord } from '../recipe.types';
import { assertRequiredString } from '../recipe.validation';

export class FindRecipeUseCase {
  constructor(private readonly repository: RecipeRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<RecipeRecord> {
    const recipeId = assertRequiredString(id, 'id');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const recipe = await this.repository.findByIdForTenant(recipeId, tenant);

    if (!recipe) {
      throw new EntityNotFoundError(`Recipe with id ${recipeId} not found`);
    }

    return recipe;
  }
}
