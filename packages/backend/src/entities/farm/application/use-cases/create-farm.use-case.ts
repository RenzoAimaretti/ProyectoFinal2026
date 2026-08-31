import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { CompanyReaderPort, FarmRepositoryPort } from '../farm.ports';
import { CreateFarmInput, FarmRecord } from '../farm.types';
import { assertPositiveNumber, assertRequiredString } from '../farm.validation';

export class CreateFarmUseCase {
  constructor(
    private readonly repository: FarmRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(companyId: string, data: CreateFarmInput): Promise<FarmRecord> {
    const name = assertRequiredString(data.name, 'name');
    const location = assertRequiredString(data.location, 'location');
    const surface = assertPositiveNumber(data.surface, 'surface');
    const tenantCompanyId = assertRequiredString(companyId, 'companyId');

    const company = await this.companyReader.findById(tenantCompanyId);
    if (!company) {
      throw new EntityNotFoundError('Company with this ID does not exist');
    }

    const existingFarm = await this.repository.findByNameAndCompanyId(
      name,
      tenantCompanyId,
    );
    if (existingFarm) {
      throw new DuplicateEntityError(
        'A farm with this name already exists for the specified company',
      );
    }

    return this.repository.create({
      name,
      location,
      companyId: tenantCompanyId,
      surface,
    });
  }
}
