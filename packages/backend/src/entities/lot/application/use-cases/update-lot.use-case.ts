import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import { FarmReaderPort, LotRepositoryPort } from '../lot.ports';
import { LotRecord, UpdateLotInput } from '../lot.types';
import { assertPositiveNumber, assertRequiredString } from '../lot.validation';

export class UpdateLotUseCase {
  constructor(
    private readonly repository: LotRepositoryPort,
    private readonly farmReader: FarmReaderPort,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data?: UpdateLotInput,
  ): Promise<LotRecord> {
    if (!data) {
      throw new InvalidInputError('No data provided for update');
    }

    const sanitizedData: UpdateLotInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
      ...(data.coords !== undefined ? { coords: data.coords } : {}),
      ...(data.area !== undefined ? { area: data.area } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    };

    if (Object.keys(sanitizedData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const lot = await this.repository.findByIdForCompany(id, companyId);
    if (!lot) {
      throw new EntityNotFoundError(`Lot with id ${id} not found`);
    }

    const updateData: UpdateLotInput = {};

    if (sanitizedData.name !== undefined) {
      updateData.name = sanitizedData.name;
    }

    if (sanitizedData.coords !== undefined) {
      updateData.coords = sanitizedData.coords;
    }

    if (sanitizedData.farmId !== undefined) {
      const farmId = assertRequiredString(sanitizedData.farmId, 'farmId');
      const farm = await this.farmReader.findByIdForCompany(farmId, companyId);
      if (!farm) {
        throw new InvalidRelationError(
          'Farm does not belong to the current company',
        );
      }

      updateData.farmId = farmId;
    }

    if (sanitizedData.area !== undefined) {
      updateData.area = assertPositiveNumber(sanitizedData.area, 'area');
    }

    if (sanitizedData.active !== undefined) {
      updateData.active = sanitizedData.active;
    }

    return this.repository.updateForCompany(id, companyId, updateData);
  }
}
