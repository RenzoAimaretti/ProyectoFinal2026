import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
import {
  LivestockMovementRepositoryPort,
  LivestockReaderPort,
  LotReaderPort,
} from '../livestock-movement.ports';
import {
  CreateLivestockMovementData,
  CreateLivestockMovementInput,
  LivestockMovementRecord,
} from '../livestock-movement.types';
import { assertRequiredString, normalizeRequiredDate } from '../livestock-movement.validation';

export class CreateLivestockMovementUseCase {
  constructor(
    private readonly repository: LivestockMovementRepositoryPort,
    private readonly livestockReader: LivestockReaderPort,
    private readonly lotReader: LotReaderPort,
  ) {}

  async execute(
    companyId: string,
    data: CreateLivestockMovementInput,
  ): Promise<LivestockMovementRecord> {
    const tenantCompanyId = assertRequiredString(companyId, 'companyId');
    const livestockId = assertRequiredString(data.livestockId, 'livestockId');
    const lotId = assertRequiredString(data.lotId, 'lotId');
    const movementDate = normalizeRequiredDate(data.movementDate, 'movementDate');

    const livestock = await this.livestockReader.findByIdForCompany(livestockId, tenantCompanyId);
    if (!livestock) {
      const existsElsewhere = await this.livestockReader.findById(livestockId);
      if (existsElsewhere) {
        throw new InvalidRelationError(
          `Livestock with id ${livestockId} does not belong to company ${tenantCompanyId}`,
        );
      }

      throw new EntityNotFoundError(`Livestock with id ${livestockId} not found`);
    }

    const lot = await this.lotReader.findByIdForCompany(lotId, tenantCompanyId);
    if (!lot) {
      const existsElsewhere = await this.lotReader.findById(lotId);
      if (existsElsewhere) {
        throw new InvalidRelationError(
          `Lot with id ${lotId} does not belong to company ${tenantCompanyId}`,
        );
      }

      throw new EntityNotFoundError(`Lot with id ${lotId} not found`);
    }

    const createData: CreateLivestockMovementData = {
      livestockId,
      lotId,
      movementDate,
      ...(data.observations !== undefined ? { observations: data.observations } : {}),
    };

    return this.repository.create(createData);
  }
}
