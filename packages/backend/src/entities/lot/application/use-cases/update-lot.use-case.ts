import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { FarmReaderPort, LotRepositoryPort } from '../lot.ports';
import { LotRecord, UpdateLotInput } from '../lot.types';
import { assertPositiveNumber, assertRequiredString } from '../lot.validation';

export class UpdateLotUseCase {
  constructor(
    private readonly repository: LotRepositoryPort,
    private readonly farmReader: FarmReaderPort,
  ) {}

  async execute(id: string, data: UpdateLotInput): Promise<LotRecord> {
    if (!data || Object.keys(data).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const lot = await this.repository.findById(id);
    if (!lot) {
      throw new EntityNotFoundError(`Lot with id ${id} not found`);
    }

    const updateData: UpdateLotInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.coords !== undefined) {
      updateData.coords = data.coords;
    }

    if (data.farmId !== undefined) {
      const farmId = assertRequiredString(data.farmId, 'farmId');
      const farm = await this.farmReader.findById(farmId);
      if (!farm) {
        throw new EntityNotFoundError('Farm with this ID does not exist');
      }

      updateData.farmId = farmId;
    }

    if (data.area !== undefined) {
      updateData.area = assertPositiveNumber(data.area, 'area');
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    return this.repository.update(id, updateData);
  }
}
