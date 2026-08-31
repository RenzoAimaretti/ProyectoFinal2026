import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  CompanyReaderPort,
  LivestockRepositoryPort,
  LotReaderPort,
} from '../livestock.ports';
import { LivestockRecord, UpdateLivestockInput } from '../livestock.types';
import {
  assertRequiredString,
  normalizeOptionalDate,
} from '../livestock.validation';

export class UpdateLivestockUseCase {
  constructor(
    private readonly repository: LivestockRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
    private readonly lotReader: LotReaderPort,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data?: UpdateLivestockInput,
  ): Promise<LivestockRecord> {
    if (!data || Object.values(data).every((value) => value === undefined)) {
      throw new InvalidInputError('No data provided for update');
    }

    const livestock = await this.repository.findByIdForCompany(id, companyId);
    if (!livestock) {
      throw new EntityNotFoundError(`Livestock with id ${id} not found`);
    }

    const nextLotId = data.lotId !== undefined ? data.lotId : livestock.lotId;

    if (nextLotId) {
      const lot = await this.lotReader.findByIdForCompany(nextLotId, companyId);

      if (!lot) {
        throw new InvalidRelationError(
          'Lot must belong to the same company as the livestock',
        );
      }
    }

    if (data.tagNumber !== undefined) {
      assertRequiredString(data.tagNumber, 'tagNumber');

      const duplicate = await this.repository.findByTagNumberAndCompanyId(
        data.tagNumber,
        companyId,
      );
      if (duplicate && duplicate.id !== id) {
        throw new DuplicateEntityError(
          'Livestock with this tagNumber already exists',
        );
      }
    }

    if (data.species !== undefined) {
      assertRequiredString(data.species, 'species');
    }

    if (data.sex !== undefined) {
      assertRequiredString(data.sex, 'sex');
    }

    const birthDate = normalizeOptionalDate(data.birthDate, 'birthDate');

    const updateData: UpdateLivestockInput = {
      ...(data.lotId !== undefined ? { lotId: data.lotId } : {}),
      ...(data.tagNumber !== undefined ? { tagNumber: data.tagNumber } : {}),
      ...(data.breed !== undefined ? { breed: data.breed } : {}),
      ...(data.species !== undefined ? { species: data.species } : {}),
      ...(birthDate !== undefined ? { birthDate } : {}),
      ...(data.sex !== undefined ? { sex: data.sex } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    return this.repository.updateForCompany(id, companyId, updateData);
  }
}
