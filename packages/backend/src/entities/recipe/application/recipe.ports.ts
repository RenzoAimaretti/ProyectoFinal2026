import {
  CreateRecipeData,
  CreateTaskPrescriptionData,
  PendingPrescriptionTask,
  RecipeRecord,
  TaskPrescriptionContext,
  UpdateRecipeData,
} from './recipe.types';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');
export const LOT_READER = Symbol('RECIPE_LOT_READER');
export const RECIPE_INPUT_READER = Symbol('RECIPE_INPUT_READER');
export const TASK_PRESCRIPTION = Symbol('TASK_PRESCRIPTION');
export const PENDING_PRESCRIPTION_READER = Symbol(
  'PENDING_PRESCRIPTION_READER',
);

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

/**
 * Read side of the agronomist inbox: the tasks still waiting for a
 * prescription. Kept separate from {@link TaskPrescriptionPort} because it is a
 * pure query; the tenant scope is applied by the adapter through the same
 * `task -> lot -> farm -> client` chain the task reads use.
 */
export interface PendingPrescriptionReaderPort {
  findPendingByTenant(tenantId: string): Promise<PendingPrescriptionTask[]>;
}
