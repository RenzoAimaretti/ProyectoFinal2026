import { EntityNotFoundError } from '../../domain/errors';
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

  async execute(data: CreateLivestockEventInput): Promise<LivestockEventRecord> {
    const livestockId = assertRequiredString(data.livestockId, 'livestockId');
    const operatorId = assertRequiredString(data.operatorId, 'operatorId');
    const eventType = data.eventType;

    if (!eventType) {
      throw new InvalidInputError('eventType is required');
    }

    const eventDate = normalizeRequiredDate(data.eventDate, 'eventDate');

    const livestock = await this.livestockReader.findById(livestockId);
    if (!livestock) {
      throw new EntityNotFoundError(
        `Livestock with id ${livestockId} not found`,
      );
    }

    const operator = await this.userReader.findById(operatorId);
    if (!operator) {
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
