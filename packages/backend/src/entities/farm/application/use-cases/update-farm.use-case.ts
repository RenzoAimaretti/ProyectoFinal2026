import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import { ClientReaderPort, FarmRepositoryPort } from '../farm.ports';
import { FarmRecord, UpdateFarmInput } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class UpdateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly clientReader: ClientReaderPort,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    data?: UpdateFarmInput,
  ): Promise<FarmRecord> {
    if (!data) {
      throw new InvalidInputError('No data provided for update');
    }

    const sanitizedData: UpdateFarmInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.surface !== undefined ? { surface: data.surface } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
    };

    if (Object.keys(sanitizedData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    if (sanitizedData.clientId === undefined) {
      throw new InvalidInputError('clientId is required');
    }

    const farm = await this.repository.findByIdForCompany(id, tenantId);
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

    const clientId = assertRequiredString(sanitizedData.clientId, 'clientId');
    const client = await this.clientReader.findByIdForTenant(clientId, tenantId);
    if (!client) {
      throw new InvalidRelationError(
        'Client does not belong to the authenticated tenant',
      );
    }

    updateData.clientId = clientId;

    return this.repository.updateForCompany(id, tenantId, updateData);
  }
}
