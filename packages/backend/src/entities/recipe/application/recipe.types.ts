import { DosageBasisValue } from '../domain/dosage-basis';
import { RecipeStatus } from '../domain/recipe-status';
import {
  PrescriptionStatusValue,
  TaskStatusValue,
} from '../../task/application/task.types';

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
  /**
   * Additive read field: the surface of the recipe lot. The prescription totals
   * are computed from it, so it is optional to keep the existing typed literals
   * working when a caller does not need the calculation.
   */
  lotArea?: number;
  items: RecipeItemRecord[];
};

/**
 * A recipe row enriched with the computed amounts. `total` is the amount for
 * the whole lot in the row's unit; `perHectare` and `per100L` are the two
 * equivalent rates (decision 14). Additive: present only when the lot area is
 * known and the totals were computed.
 */
export type RecipeItemOutput = RecipeItemRecord & {
  total?: number;
  perHectare?: number;
  per100L?: number;
};

/**
 * R5: the shape the editor and the server share for a single prescription. It
 * is the stored recipe plus the optional computed totals (`caldoTotal`) and the
 * optional per-item `total`.
 */
export type RecipeOutput = Omit<RecipeRecord, 'items'> & {
  caldoTotal?: number;
  items: RecipeItemOutput[];
};

/**
 * The task facts the prescription lifecycle rules need. `status` decides
 * whether the prescription is frozen and `lotId` must match the prescription
 * lot; `taskTypeRequiresPrescription` tells whether the task was born SIN_RECETA.
 * `lotArea` is the surface of the task lot and feeds the totals calculation
 * without a second round trip.
 */
export type TaskPrescriptionContext = {
  id: string;
  lotId: string;
  status: TaskStatusValue;
  taskTypeRequiresPrescription: boolean;
  lotArea: number;
};

/**
 * The agronomist inbox row: a task still waiting for its prescription, with the
 * display names the console needs to render it. Tenant-scoped through
 * `task -> lot -> farm -> client`, the same chain the task reads use.
 */
export type PendingPrescriptionTask = {
  id: string;
  lotId: string;
  lotName: string;
  farmName: string;
  /**
   * Surface of the task lot in hectares. Additive inbox field: the console
   * editor computes `caldoTotal = sprayVolume * lotArea` live, exactly as the
   * server does, without an extra round trip.
   */
  lotArea: number;
  taskTypeId: string;
  taskTypeName: string;
  status: TaskStatusValue;
  startedAt: Date | null;
  prescriptionStatus: PrescriptionStatusValue;
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
  /**
   * Optional: a prescription takes the lot from its task. When a caller does
   * send it, it is checked against the task lot so a mismatched lot is rejected.
   */
  lotId?: string;
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

/**
 * The data the task-prescription port needs to attach a prescription to a task.
 * `taskId` is required here because the attachment always marks the task.
 */
export type CreateTaskPrescriptionData = CreateRecipeData & {
  taskId: string;
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
