import { CreateRecipeData, RecipeRecord } from './recipe.types';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');
export const LOT_READER = Symbol('RECIPE_LOT_READER');
export const RECIPE_INPUT_READER = Symbol('RECIPE_INPUT_READER');

export interface RecipeRepositoryPort {
  create(data: CreateRecipeData): Promise<RecipeRecord>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<RecipeRecord | null>;
  findAllByLotForTenant(
    lotId: string,
    tenantId: string,
  ): Promise<RecipeRecord[]>;
}

export interface LotReaderPort {
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<{ id: string } | null>;
}

export interface RecipeInputReaderPort {
  findExistingIdsForTenant(
    inputIds: string[],
    tenantId: string,
  ): Promise<string[]>;
}
