import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { CompanyReaderPort, FarmRepositoryPort } from '../farm.ports';
import { FarmRecord, UpdateFarmInput } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class UpdateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(id: string, data: UpdateFarmInput): Promise<FarmRecord> {
    if (!data || Object.keys(data).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const farm = await this.repository.findById(id);
    if (!farm) {
      throw new EntityNotFoundError(`Farm with id ${id} not found`);
    }

    const updateData: UpdateFarmInput = {};

    if (data.name !== undefined) {
      updateData.name = assertRequiredString(data.name, 'name');
    }

    if (data.location !== undefined) {
      updateData.location = assertRequiredString(data.location, 'location');
    }

    if (data.companyId !== undefined) {
      const companyId = assertRequiredString(data.companyId, 'companyId');
      const company = await this.companyReader.findById(companyId);
      if (!company) {
        throw new EntityNotFoundError('Company with this ID does not exist');
      }

      updateData.companyId = companyId;
    }

    if (data.surface !== undefined) {
      updateData.surface = assertPositiveNumber(data.surface, 'surface');
    }

    return this.repository.update(id, updateData);
  }
}
