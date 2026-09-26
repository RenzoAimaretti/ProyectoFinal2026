import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
import {
  LivestockEventRepositoryPort,
  LivestockReaderPort,
  UserReaderPort,
} from '../livestock-event.ports';
import {
  CreateLivestockEventData,
  CreateLivestockEventInput,
  LivestockEventRecord,
} from '../livestock-event.types';
import {
  assertRequiredString,
  normalizeRequiredDate,
} from '../livestock-event.validation';
import { InvalidInputError } from '../../domain/errors';

export class CreateLivestockEventUseCase {
  constructor(
    private readonly repository: LivestockEventRepositoryPort,
    private readonly livestockReader: LivestockReaderPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(
    companyIdOrData: string | CreateLivestockEventInput,
    maybeData?: CreateLivestockEventInput,
  ): Promise<LivestockEventRecord> {
    const hasCompanyScope = typeof companyIdOrData === 'string';
    const companyId = hasCompanyScope ? companyIdOrData : undefined;
    const data = hasCompanyScope ? maybeData : companyIdOrData;

    if (!data) {
      throw new InvalidRelationError('Create livestock event requires input data');
    }

    const livestockId = assertRequiredString(data.livestockId, 'livestockId');
    const operatorId = assertRequiredString(data.operatorId, 'operatorId');
    const eventType = data.eventType;

    if (!eventType) {
      throw new InvalidInputError('eventType is required');
    }

    const eventDate = normalizeRequiredDate(data.eventDate, 'eventDate');

    const livestock = companyId
      ? await this.livestockReader.findByIdForCompany(livestockId, companyId)
      : await this.livestockReader.findById(livestockId);
    if (!livestock) {
      const existsElsewhere = companyId ? await this.livestockReader.findById(livestockId) : null;
      if (existsElsewhere) {
        throw new InvalidRelationError(
          `Livestock with id ${livestockId} does not belong to company ${companyId}`,
        );
      }

      throw new EntityNotFoundError(`Livestock with id ${livestockId} not found`);
    }

    const operator = companyId
      ? await this.userReader.findByIdForCompany(operatorId, companyId)
      : await this.userReader.findById(operatorId);
    if (!operator) {
      const existsElsewhere = companyId ? await this.userReader.findById(operatorId) : null;
      if (existsElsewhere) {
        throw new InvalidRelationError(
          `Operator with id ${operatorId} does not belong to company ${companyId}`,
        );
      }

      throw new EntityNotFoundError(`Operator with id ${operatorId} not found`);
    }

    const createData: CreateLivestockEventData = {
      eventDate,
      eventType,
      livestockId,
      operatorId,
      ...(data.obs !== undefined ? { obs: data.obs } : {}),
      ...(eventType === 'VACUNACION' && data.vaccine !== undefined
        ? { vaccine: data.vaccine }
        : {}),
      ...(eventType === 'VACUNACION' && data.dose !== undefined
        ? { dose: data.dose }
        : {}),
    };

    return this.repository.create(createData);
  }
}
