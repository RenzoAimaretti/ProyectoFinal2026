import { DuplicateEntityError, InvalidRelationError } from '../../domain/errors';
import { ClientReaderPort, FarmRepositoryPort } from '../farm.ports';
import { CreateFarmInput, FarmRecord } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class CreateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly clientReader: ClientReaderPort,
  ) {}

  async execute(tenantId: string, data: CreateFarmInput): Promise<FarmRecord> {
    const name = assertRequiredString(data.name, 'name');
    const location = assertRequiredString(data.location, 'location');
    const surface = assertPositiveNumber(data.surface, 'surface');
    const clientId = assertRequiredString(data.clientId, 'clientId');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const client = await this.clientReader.findByIdForTenant(clientId, tenant);
    if (!client) {
      throw new InvalidRelationError(
        'Client does not belong to the authenticated tenant',
      );
    }

    const existingFarm = await this.repository.findByNameAndClientId(
      name,
      clientId,
    );
    if (existingFarm) {
      throw new DuplicateEntityError(
        'A farm with this name already exists for the specified client',
      );
    }

    return this.repository.create({
      name,
      location,
      clientId,
      surface,
    });
  }
}
