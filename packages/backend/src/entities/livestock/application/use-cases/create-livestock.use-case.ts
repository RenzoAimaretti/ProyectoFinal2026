import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  CompanyReaderPort,
  LivestockRepositoryPort,
  LotReaderPort,
} from '../livestock.ports';
import { CreateLivestockInput, LivestockRecord } from '../livestock.types';
import {
  assertRequiredString,
  normalizeOptionalDate,
} from '../livestock.validation';

export class CreateLivestockUseCase {
  constructor(
    private readonly repository: LivestockRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
    private readonly lotReader: LotReaderPort,
  ) {}

  async execute(data: CreateLivestockInput): Promise<LivestockRecord> {
    const companyId = assertRequiredString(data.companyId, 'companyId');
    const tagNumber = assertRequiredString(data.tagNumber, 'tagNumber');
    const species = assertRequiredString(data.species, 'species');
    const sex = assertRequiredString(data.sex, 'sex');

    const company = await this.companyReader.findById(companyId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${companyId} not found`);
    }

    if (data.lotId) {
      const lot = await this.lotReader.findById(data.lotId);

      if (!lot) {
        throw new EntityNotFoundError(`Lot with id ${data.lotId} not found`);
      }

      if (lot.companyId !== companyId) {
        throw new InvalidRelationError(
          'Lot must belong to the same company as the livestock',
        );
      }
    }

    const duplicate = await this.repository.findByTagNumber(tagNumber);
    if (duplicate) {
      throw new DuplicateEntityError(
        'Livestock with this tagNumber already exists',
      );
    }

    return this.repository.create({
      companyId,
      lotId: data.lotId ?? null,
      tagNumber,
      breed: data.breed ?? null,
      species,
      birthDate: normalizeOptionalDate(data.birthDate, 'birthDate'),
      sex,
    });
  }
}
