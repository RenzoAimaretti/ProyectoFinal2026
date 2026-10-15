import {
  CreateRecipeData,
  CreateTaskPrescriptionData,
  RecipeRecord,
  TaskPrescriptionContext,
  UpdateRecipeData,
} from './recipe.types';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');
export const LOT_READER = Symbol('RECIPE_LOT_READER');
export const RECIPE_INPUT_READER = Symbol('RECIPE_INPUT_READER');
export const TASK_PRESCRIPTION = Symbol('TASK_PRESCRIPTION');

export interface RecipeRepositoryPort {
  create(data: CreateRecipeData): Promise<RecipeRecord>;
  update(
    id: string,
    tenantId: string,
    data: UpdateRecipeData,
  ): Promise<RecipeRecord>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<RecipeRecord | null>;
  /**
   * Reads the prescription attached to a task. A task carries at most one
   * prescription (`Recipe.taskId` is unique), so this resolves the duplicate
   * check and the pending-prescription inbox.
   */
  findByTaskId(
    taskId: string,
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

/**
 * The task side of the prescription aggregate. It reads the task facts the
 * lifecycle rules need and owns the one atomic write that attaches a
 * prescription to a task.
 */
export interface TaskPrescriptionPort {
  findContextByIdForTenant(
    taskId: string,
    tenantId: string,
  ): Promise<TaskPrescriptionContext | null>;
  /**
   * Creates the prescription (recipe plus items) and marks the task as
   * prescribed (`CON_RECETA`) in a single transaction, so the two writes can
   * never half-apply.
   */
  attachPrescription(data: CreateTaskPrescriptionData): Promise<RecipeRecord>;
}
