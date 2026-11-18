import {
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
import {
  RecipeInputReaderPort,
  RecipeRepositoryPort,
  TaskPrescriptionPort,
} from '../recipe.ports';
import { RecipeOutput, UpdateRecipeInput } from '../recipe.types';
import { withPrescriptionTotals } from '../recipe.totals';
import {
  assertOptionalString,
  assertRequiredDate,
  assertRequiredString,
  normalizeRecipeItems,
} from '../recipe.validation';

/**
 * Edits an existing prescription. The task link is fixed at creation, so the
 * request can never move the prescription to another task. R7: the edit is
 * rejected once the task has started, and the totals are always recomputed from
 * the resulting state.
 */
export class UpdateRecipeUseCase {
  constructor(
    private readonly repository: RecipeRepositoryPort,
    private readonly taskPrescription: TaskPrescriptionPort,
    private readonly inputReader: RecipeInputReaderPort,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    data: UpdateRecipeInput,
  ): Promise<RecipeOutput> {
    const recipeId = assertRequiredString(id, 'id');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const recipe = await this.repository.findByIdForTenant(recipeId, tenant);

    if (!recipe) {
      throw new EntityNotFoundError(`Recipe with id ${recipeId} not found`);
    }

    let lotArea = recipe.lotArea;

    if (recipe.taskId) {
      const context = await this.taskPrescription.findContextByIdForTenant(
        recipe.taskId,
        tenant,
      );

      if (!context) {
        throw new EntityNotFoundError(
          `Task with id ${recipe.taskId} not found`,
        );
      }

      assertPrescriptionLotMatchesTask(recipe.lotId, context.lotId);
      assertPrescriptionEditable(context);
      lotArea = context.lotArea;
    }

    const date =
      data.date !== undefined ? assertRequiredDate(data.date, 'date') : recipe.date;
    const pest =
      data.pest !== undefined
        ? assertOptionalRecipeText(data.pest, 'pest')
        : recipe.pest ?? null;
    const crop =
      data.crop !== undefined
        ? assertOptionalRecipeText(data.crop, 'crop')
        : recipe.crop ?? null;
    const observations =
      data.observations !== undefined
        ? assertOptionalString(data.observations, 'observations')
        : recipe.observations;
    const sprayVolume =
      data.sprayVolume !== undefined
        ? assertValidSprayVolume(data.sprayVolume, 'sprayVolume')
        : recipe.sprayVolume;
    const sprayVolumeUnit =
      data.sprayVolumeUnit !== undefined
        ? assertRequiredString(data.sprayVolumeUnit, 'sprayVolumeUnit')
        : recipe.sprayVolumeUnit;
    const plan = assertValidReapplicationPlan(
      {
        reapplicationIntervalDays:
          data.reapplicationIntervalDays ?? recipe.reapplicationIntervalDays,
        reapplicationDate:
          data.reapplicationDate ?? recipe.reapplicationDate,
      },
      date,
    );

    const itemsData =
      data.items !== undefined ? normalizeRecipeItems(data.items) : undefined;

    if (itemsData) {
      const inputIds = [...new Set(itemsData.map((item) => item.inputId))];
      const existingInputIds =
        await this.inputReader.findExistingIdsForTenant(inputIds, tenant);
      const existingSet = new Set(existingInputIds);
      const missingInputIds = inputIds.filter((id) => !existingSet.has(id));

      if (missingInputIds.length > 0) {
        throw new InvalidRelationError(
          `Recipe inputs do not belong to the authenticated tenant: ${missingInputIds.join(', ')}`,
        );
      }
    }

    const record = await this.repository.update(recipeId, tenant, {
      date,
      pest,
      crop,
      observations,
      sprayVolume,
      sprayVolumeUnit,
      reapplicationIntervalDays: plan.intervalDays,
      reapplicationDate: plan.date,
      ...(itemsData !== undefined ? { items: itemsData } : {}),
    });

    return withPrescriptionTotals(record, lotArea);
  }
}
