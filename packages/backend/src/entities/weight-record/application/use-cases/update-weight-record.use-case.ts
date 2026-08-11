import {
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import {
  UserReaderPort,
  WeightRecordRepositoryPort,
} from '../weight-record.ports';
import {
  UpdateWeightRecordData,
  UpdateWeightRecordInput,
  WeightRecordRecord,
} from '../weight-record.types';
import {
  assertRequiredString,
  normalizeOptionalDate,
} from '../weight-record.validation';

export class UpdateWeightRecordUseCase {
  constructor(
    private readonly repository: WeightRecordRepositoryPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(
    id: string,
    data?: UpdateWeightRecordInput,
  ): Promise<WeightRecordRecord> {
    if (!data || Object.values(data).every((value) => value === undefined)) {
      throw new InvalidInputError('No data provided for update');
    }

    const record = await this.repository.findById(id);
    if (!record) {
      throw new EntityNotFoundError(`Weight record with id ${id} not found`);
    }

    if (data.operatorId !== undefined) {
      const operatorId = assertRequiredString(data.operatorId, 'operatorId');
      const operator = await this.userReader.findById(operatorId);

      if (!operator) {
        throw new EntityNotFoundError(`Operator with id ${operatorId} not found`);
      }
    }

    const measuredAt = normalizeOptionalDate(data.measuredAt, 'measuredAt');

    const updateData: UpdateWeightRecordData = {
      ...(data.operatorId !== undefined
        ? { operatorId: assertRequiredString(data.operatorId, 'operatorId') }
        : {}),
      ...(data.weight !== undefined ? { weight: data.weight } : {}),
      ...(measuredAt !== undefined ? { measuredAt } : {}),
    };

    if (Object.keys(updateData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    return this.repository.update(id, updateData);
  }
}
