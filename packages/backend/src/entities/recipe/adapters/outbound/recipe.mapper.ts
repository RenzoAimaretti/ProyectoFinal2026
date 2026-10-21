import { RecipeItemRecord, RecipeRecord } from '../../application/recipe.types';
import { DosageBasisValue } from '../../domain/dosage-basis';
import { RecipeStatus } from '../../domain/recipe-status';
import { orderRecipeItemsByLoadOrder } from '../../domain/recipe.rules';

export const RECIPE_ITEM_ORDER_BY = [
  { loadOrder: 'asc' as const },
  { id: 'asc' as const },
];

/**
 * Items are always read together with the catalogue name of their input so the
 * inbound adapter can expose `inputName` without an extra round trip.
 */
export const RECIPE_ITEM_INCLUDE = {
  orderBy: RECIPE_ITEM_ORDER_BY,
  include: { input: { select: { name: true as const } } },
};

/**
 * The single-recipe read additionally brings the lot surface so the totals can
 * be computed without a second query. Additive: the list read keeps its shape.
 */
export const RECIPE_DETAIL_INCLUDE = {
  items: RECIPE_ITEM_INCLUDE,
  lot: { select: { area: true } },
};

export type RecipeItemRow = {
  id: string;
  recipeId: string;
  inputId: string;
  dose: number;
  dosageBasis?: DosageBasisValue;
  unit: string | null;
  loadOrder: number;
  input?: { name: string } | null;
};

export type RecipeRow = {
  id: string;
  lotId: string;
  taskId?: string | null;
  date: Date;
  status: RecipeStatus;
  pest?: string | null;
  crop?: string | null;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  reapplicationIntervalDays?: number | null;
  reapplicationDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lot?: { area: number } | null;
  items: RecipeItemRow[];
};

export function toRecipeRecord(recipe: RecipeRow): RecipeRecord {
  return {
    id: recipe.id,
    lotId: recipe.lotId,
    taskId: recipe.taskId,
    date: recipe.date,
    status: recipe.status,
    pest: recipe.pest,
    crop: recipe.crop,
    observations: recipe.observations,
    sprayVolume: recipe.sprayVolume,
    sprayVolumeUnit: recipe.sprayVolumeUnit,
    reapplicationIntervalDays: recipe.reapplicationIntervalDays,
    reapplicationDate: recipe.reapplicationDate,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    lotArea: recipe.lot?.area,
    items: orderRecipeItemsByLoadOrder(recipe.items).map(
      (item): RecipeItemRecord => ({
        id: item.id,
        recipeId: item.recipeId,
        inputId: item.inputId,
        dose: item.dose,
        dosageBasis: item.dosageBasis,
        unit: item.unit,
        loadOrder: item.loadOrder,
        inputName: item.input?.name,
      }),
    ),
  };
}
