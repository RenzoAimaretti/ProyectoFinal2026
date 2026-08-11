import {
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import {
  LivestockEventRepositoryPort,
  LivestockReaderPort,
  UserReaderPort,
} from '../livestock-event.ports';
import {
  LivestockEventRecord,
  UpdateLivestockEventData,
  UpdateLivestockEventInput,
} from '../livestock-event.types';
import {
  assertRequiredString,
  normalizeOptionalDate,
} from '../livestock-event.validation';

export class UpdateLivestockEventUseCase {
  constructor(
    private readonly repository: LivestockEventRepositoryPort,
    private readonly livestockReader: LivestockReaderPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(
    id: string,
    data?: UpdateLivestockEventInput,
  ): Promise<LivestockEventRecord> {
    if (!data || Object.values(data).every((value) => value === undefined)) {
      throw new InvalidInputError('No data provided for update');
    }

    const event = await this.repository.findById(id);
    if (!event) {
      throw new EntityNotFoundError(`Livestock event with id ${id} not found`);
    }

    if (data.livestockId !== undefined) {
      const livestockId = assertRequiredString(data.livestockId, 'livestockId');
      const livestock = await this.livestockReader.findById(livestockId);

      if (!livestock) {
        throw new EntityNotFoundError(
          `Livestock with id ${livestockId} not found`,
        );
      }
    }

    if (data.operatorId !== undefined) {
      const operatorId = assertRequiredString(data.operatorId, 'operatorId');
      const operator = await this.userReader.findById(operatorId);

      if (!operator) {
        throw new EntityNotFoundError(`Operator with id ${operatorId} not found`);
      }
    }

    const eventDate = normalizeOptionalDate(data.eventDate, 'eventDate');

    const updateData: UpdateLivestockEventData = {
      ...(eventDate !== undefined ? { eventDate } : {}),
      ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
      ...(data.livestockId !== undefined
        ? { livestockId: assertRequiredString(data.livestockId, 'livestockId') }
        : {}),
      ...(data.operatorId !== undefined
        ? { operatorId: assertRequiredString(data.operatorId, 'operatorId') }
        : {}),
      ...(data.obs !== undefined ? { obs: data.obs } : {}),
      ...(data.eventType !== undefined && data.eventType !== 'VACUNACION'
        ? { vaccine: null, dose: null }
        : {
            ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
            ...(data.dose !== undefined ? { dose: data.dose } : {}),
          }),
    };

    if (Object.keys(updateData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    return this.repository.update(id, updateData);
  }
}
