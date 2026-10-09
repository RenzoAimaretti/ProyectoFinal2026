import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { InputCategoryReaderPort, InputRepositoryPort, InputStockReaderPort } from '../input.ports';
import { InputRecord, UpdateInputInput } from '../input.types';
import {
  assertInputUnit,
  assertNonEmptyObject,
  assertOptionalBoolean,
  assertRequiredString,
} from '../input.validation';

export class UpdateInputUseCase {
  constructor(
    private readonly repository: InputRepositoryPort,
    private readonly stockReader: InputStockReaderPort,
    private readonly categories: InputCategoryReaderPort,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    data?: UpdateInputInput,
  ): Promise<InputRecord> {
    const input = assertNonEmptyObject(data);

    const existing = await this.repository.findByIdForTenant(id, tenantId);
    if (!existing) {
      throw new EntityNotFoundError(`Input with id ${id} not found`);
    }

    const updateData: UpdateInputInput = {};

    if (input.categoryId !== undefined) {
      const categoryId = assertRequiredString(input.categoryId, 'categoryId');
      if (!await this.categories.findByIdForTenant(categoryId, tenantId)) {
        throw new EntityNotFoundError(`Input category with id ${categoryId} not found`);
      }
      updateData.categoryId = categoryId;
    }

    if (input.name !== undefined) {
      updateData.name = assertRequiredString(input.name, 'name');
    }

    if (input.unit !== undefined) {
      updateData.unit = assertInputUnit(input.unit);
    }

    if (input.active !== undefined) {
      updateData.active = assertOptionalBoolean(input.active, 'active');
    }

    // Guard: a stock balance inherits the unit of its catalogue input, so
    // re-denominating the input would silently reinterpret every non-zero
    // balance. Only a genuine change is checked, and a zero balance may still
    // move because it carries no meaning to reinterpret.
    if (updateData.unit !== undefined && updateData.unit !== existing.unit) {
      const hasBalance = await this.stockReader.hasNonZeroBalance(id);
      if (hasBalance) {
        throw new InvalidInputError(
          `Cannot change the unit of input ${id}: it has a non-zero stock balance`,
        );
      }
    }

    return this.repository.updateForTenant(id, tenantId, updateData);
  }
}
