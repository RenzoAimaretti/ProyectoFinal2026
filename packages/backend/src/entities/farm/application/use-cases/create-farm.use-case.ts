import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { CompanyReaderPort, FarmRepositoryPort } from '../farm.ports';
import { CreateFarmInput, FarmRecord } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class CreateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(data: CreateFarmInput): Promise<FarmRecord> {
    const name = assertRequiredString(data.name, 'name');
    const location = assertRequiredString(data.location, 'location');
    const companyId = assertRequiredString(data.companyId, 'companyId');
    const surface = assertPositiveNumber(data.surface, 'surface');

    const company = await this.companyReader.findById(companyId);
    if (!company) {
      throw new EntityNotFoundError('Company with this ID does not exist');
    }

    const existingFarm = await this.repository.findByNameAndCompanyId(
      name,
      companyId,
    );
    if (existingFarm) {
      throw new DuplicateEntityError(
        'A farm with this name already exists for the specified company',
      );
    }

    return this.repository.create({
      name,
      location,
      companyId,
      surface,
    });
  }
}
