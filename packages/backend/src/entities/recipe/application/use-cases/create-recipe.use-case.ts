import { InvalidRelationError } from '../../domain/errors';
import { RECIPE_INITIAL_STATUS } from '../../domain/recipe-status';
import { assertValidSprayVolume } from '../../domain/recipe.rules';
import {
  LotReaderPort,
  RecipeInputReaderPort,
  RecipeRepositoryPort,
} from '../recipe.ports';
import { CreateRecipeInput, RecipeRecord } from '../recipe.types';
import {
  assertOptionalString,
  assertRequiredDate,
  assertRequiredString,
  normalizeRecipeItems,
} from '../recipe.validation';

export class CreateRecipeUseCase {
  constructor(
    private readonly repository: RecipeRepositoryPort,
    private readonly lotReader: LotReaderPort,
    private readonly inputReader: RecipeInputReaderPort,
  ) {}

  async execute(
    tenantId: string,
    data: CreateRecipeInput,
  ): Promise<RecipeRecord> {
    const tenant = assertRequiredString(tenantId, 'tenantId');
    const lotId = assertRequiredString(data.lotId, 'lotId');
    const date = assertRequiredDate(data.date, 'date');
    const observations = assertOptionalString(data.observations, 'observations');
    const sprayVolume = assertValidSprayVolume(
      data.sprayVolume,
      'sprayVolume',
    );
    const sprayVolumeUnit = assertRequiredString(
      data.sprayVolumeUnit,
      'sprayVolumeUnit',
    );
    const items = normalizeRecipeItems(data.items);

    const lot = await this.lotReader.findByIdForTenant(lotId, tenant);
    if (!lot) {
      throw new InvalidRelationError(
        'Lot does not belong to the authenticated tenant',
      );
    }

    const inputIds = [...new Set(items.map((item) => item.inputId))];
    const existingInputIds =
      await this.inputReader.findExistingIdsForTenant(inputIds, tenant);
    const existing = new Set(existingInputIds);
    const missingInputIds = inputIds.filter((id) => !existing.has(id));

    if (missingInputIds.length > 0) {
      throw new InvalidRelationError(
        `Recipe inputs do not belong to the authenticated tenant: ${missingInputIds.join(', ')}`,
      );
    }

    return this.repository.create({
      lotId,
      date,
      status: RECIPE_INITIAL_STATUS,
      observations,
      sprayVolume,
      sprayVolumeUnit,
      items,
    });
  }
}
