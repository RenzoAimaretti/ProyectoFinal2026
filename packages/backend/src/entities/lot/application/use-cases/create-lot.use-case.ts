import {
  DuplicateEntityError,
  InvalidRelationError,
} from '../../domain/errors';
import { FarmReaderPort, LotRepositoryPort } from '../lot.ports';
import { CreateLotInput, LotRecord } from '../lot.types';
import { assertPositiveNumber, assertRequiredString } from '../lot.validation';

export class CreateLotUseCase {
  constructor(
    private readonly repository: LotRepositoryPort,
    private readonly farmReader: FarmReaderPort,
  ) {}

  async execute(companyId: string, data: CreateLotInput): Promise<LotRecord> {
    const name = assertRequiredString(data.name, 'name');
    const farmId = assertRequiredString(data.farmId, 'farmId');
    const coords = assertRequiredString(data.coords, 'coords');
    const area = assertPositiveNumber(data.area, 'area');

    const farm = await this.farmReader.findByIdForCompany(farmId, companyId);
    if (!farm) {
      throw new InvalidRelationError('Farm does not belong to the current company');
    }

    const existingLot = await this.repository.findByNameAndFarmId(name, farmId);
    if (existingLot) {
      throw new DuplicateEntityError(
        'A lot with this name already exists for the specified farm',
      );
    }

    return this.repository.create({
      name,
      farmId,
      coords,
      area,
    });
  }
}
