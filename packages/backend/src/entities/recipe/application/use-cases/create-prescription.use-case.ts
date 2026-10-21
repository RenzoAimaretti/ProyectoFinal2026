import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  assertOptionalRecipeText,
  assertPrescriptionEditable,
  assertPrescriptionLotMatchesTask,
  assertValidReapplicationPlan,
  assertValidSprayVolume,
} from '../../domain/recipe.rules';
import { RECIPE_INITIAL_STATUS } from '../../domain/recipe-status';
import {
  RecipeInputReaderPort,
  RecipeRepositoryPort,
  TaskPrescriptionPort,
} from '../recipe.ports';
import { CreateRecipeInput, RecipeOutput } from '../recipe.types';
import { withPrescriptionTotals } from '../recipe.totals';
import {
  assertOptionalString,
  assertRequiredDate,
  assertRequiredString,
  normalizeRecipeItems,
} from '../recipe.validation';

/**
 * Writes a phytosanitary prescription for a task. The task is the aggregate root
 * and the prescription is attached atomically (recipe plus `CON_RECETA`), so this
 * use case reads the task facts through the task port, applies the domain rules
 * (lot consistency and editability) and delegates the single atomic write.
 *
 * `LaborType.requiresPrescription` marks the prescription as REQUIRED; it never
 * restricts who may be prescribed, so a task that does not require one is still
 * accepted (a fertilization task also needs a caldo/dose calculation).
 */
export class CreatePrescriptionUseCase {
  constructor(
    private readonly repository: RecipeRepositoryPort,
    private readonly taskPrescription: TaskPrescriptionPort,
    private readonly inputReader: RecipeInputReaderPort,
  ) {}

  async execute(
    tenantId: string,
    data: CreateRecipeInput,
  ): Promise<RecipeOutput> {
    const tenant = assertRequiredString(tenantId, 'tenantId');
    const taskId = assertRequiredString(data.taskId, 'taskId');
    const date = assertRequiredDate(data.date, 'date');
    const pest = assertOptionalRecipeText(data.pest, 'pest');
    const crop = assertOptionalRecipeText(data.crop, 'crop');
    const observations = assertOptionalString(data.observations, 'observations');
    const sprayVolume = assertValidSprayVolume(data.sprayVolume, 'sprayVolume');
    const sprayVolumeUnit = assertRequiredString(
      data.sprayVolumeUnit,
      'sprayVolumeUnit',
    );
    const plan = assertValidReapplicationPlan(
      {
        reapplicationIntervalDays: data.reapplicationIntervalDays,
        reapplicationDate: data.reapplicationDate,
      },
      date,
    );
    const items = normalizeRecipeItems(data.items);

    const context = await this.taskPrescription.findContextByIdForTenant(
      taskId,
      tenant,
    );

    if (!context) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    assertPrescriptionLotMatchesTask(data.lotId ?? context.lotId, context.lotId);
    assertPrescriptionEditable(context);

    const existing = await this.repository.findByTaskId(taskId, tenant);
    if (existing) {
      throw new DuplicateEntityError(
        `Task ${taskId} already has a prescription`,
      );
    }

    const inputIds = [...new Set(items.map((item) => item.inputId))];
    const existingInputIds =
      await this.inputReader.findExistingIdsForTenant(inputIds, tenant);
    const existingSet = new Set(existingInputIds);
    const missingInputIds = inputIds.filter((id) => !existingSet.has(id));

    if (missingInputIds.length > 0) {
      throw new InvalidRelationError(
        `Recipe inputs do not belong to the authenticated tenant: ${missingInputIds.join(', ')}`,
      );
    }

    const record = await this.taskPrescription.attachPrescription({
      taskId,
      lotId: context.lotId,
      date,
      status: RECIPE_INITIAL_STATUS,
      pest,
      crop,
      observations,
      sprayVolume,
      sprayVolumeUnit,
      reapplicationIntervalDays: plan.intervalDays,
      reapplicationDate: plan.date,
      items,
    });

    return withPrescriptionTotals(record, context.lotArea);
  }
}
