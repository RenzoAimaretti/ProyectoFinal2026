import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { CompanyReaderPort, FarmRepositoryPort } from '../farm.ports';
import { FarmRecord, UpdateFarmInput } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class UpdateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data?: UpdateFarmInput,
  ): Promise<FarmRecord> {
    if (!data) {
      throw new InvalidInputError('No data provided for update');
    }

    const sanitizedData: UpdateFarmInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.surface !== undefined ? { surface: data.surface } : {}),
    };

    if (Object.keys(sanitizedData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const farm = await this.repository.findByIdForCompany(id, companyId);
    if (!farm) {
      throw new EntityNotFoundError(`Farm with id ${id} not found`);
    }

    const updateData: UpdateFarmInput = {};

    if (sanitizedData.name !== undefined) {
      updateData.name = assertRequiredString(sanitizedData.name, 'name');
    }

    if (sanitizedData.location !== undefined) {
      updateData.location = assertRequiredString(
        sanitizedData.location,
        'location',
      );
    }

    if (sanitizedData.surface !== undefined) {
      updateData.surface = assertPositiveNumber(sanitizedData.surface, 'surface');
    }

    return this.repository.updateForCompany(id, companyId, updateData);
  }
}
