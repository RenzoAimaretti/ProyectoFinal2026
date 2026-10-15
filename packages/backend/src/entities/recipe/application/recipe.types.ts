import { DosageBasisValue } from '../domain/dosage-basis';
import { RecipeStatus } from '../domain/recipe-status';
import { TaskStatusValue } from '../../task/application/task.types';

export type { DosageBasisValue } from '../domain/dosage-basis';
export type { PrescriptionTotals } from '../domain/spray-calculation';

export type RecipeItemRecord = {
  id: string;
  recipeId: string;
  inputId: string;
  dose: number;
  /** Additive read field: how the dose is expressed. */
  dosageBasis?: DosageBasisValue;
  unit: string | null;
  loadOrder: number;
  /** Additive read enrichment: catalogue name of the input. */
  inputName?: string;
};

export type RecipeRecord = {
  id: string;
  lotId: string;
  /** Additive read field: the task this prescription belongs to. */
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
  items: RecipeItemRecord[];
};

/**
 * The task facts the prescription lifecycle rules need. `status` decides
 * whether the prescription is frozen and `lotId` must match the prescription
 * lot; `taskTypeRequiresPrescription` tells whether the task was born SIN_RECETA.
 */
export type TaskPrescriptionContext = {
  id: string;
  lotId: string;
  status: TaskStatusValue;
  taskTypeRequiresPrescription: boolean;
};

export type CreateRecipeItemInput = {
  inputId: string;
  dose: number;
  dosageBasis?: DosageBasisValue;
  unit?: string;
  loadOrder: number;
};

export type CreateRecipeInput = {
  taskId?: string;
  lotId: string;
  date: string;
  pest?: string;
  crop?: string;
  observations?: string;
  sprayVolume: number;
  sprayVolumeUnit: string;
  reapplicationIntervalDays?: number;
  reapplicationDate?: string;
  items: CreateRecipeItemInput[];
};

export type CreateRecipeItemData = {
  inputId: string;
  dose: number;
  dosageBasis?: DosageBasisValue;
  unit: string | null;
  loadOrder: number;
};

export type CreateRecipeData = {
  taskId?: string;
  lotId: string;
  date: Date;
  status: RecipeStatus;
  pest?: string | null;
  crop?: string | null;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  reapplicationIntervalDays?: number | null;
  reapplicationDate?: Date | null;
  items: CreateRecipeItemData[];
};

export type UpdateRecipeItemInput = CreateRecipeItemInput;

export type UpdateRecipeInput = {
  date?: string;
  pest?: string;
  crop?: string;
  observations?: string;
  sprayVolume?: number;
  sprayVolumeUnit?: string;
  reapplicationIntervalDays?: number;
  reapplicationDate?: string;
  items?: UpdateRecipeItemInput[];
};

export type UpdateRecipeItemData = CreateRecipeItemData;

export type UpdateRecipeData = {
  date?: Date;
  pest?: string | null;
  crop?: string | null;
  observations?: string | null;
  sprayVolume?: number;
  sprayVolumeUnit?: string;
  reapplicationIntervalDays?: number | null;
  reapplicationDate?: Date | null;
  items?: UpdateRecipeItemData[];
};
