import { RecipeStatus } from '../domain/recipe-status';

export type RecipeItemRecord = {
  id: string;
  recipeId: string;
  inputId: string;
  dose: number;
  unit: string | null;
  loadOrder: number;
};

export type RecipeRecord = {
  id: string;
  lotId: string;
  date: Date;
  status: RecipeStatus;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  createdAt: Date;
  updatedAt: Date;
  items: RecipeItemRecord[];
};

export type CreateRecipeItemInput = {
  inputId: string;
  dose: number;
  unit?: string;
  loadOrder: number;
};

export type CreateRecipeInput = {
  lotId: string;
  date: string;
  observations?: string;
  sprayVolume: number;
  sprayVolumeUnit: string;
  items: CreateRecipeItemInput[];
};

export type CreateRecipeItemData = {
  inputId: string;
  dose: number;
  unit: string | null;
  loadOrder: number;
};

export type CreateRecipeData = {
  lotId: string;
  date: Date;
  status: RecipeStatus;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  items: CreateRecipeItemData[];
};
