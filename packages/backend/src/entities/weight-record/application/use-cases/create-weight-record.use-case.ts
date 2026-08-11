import { EntityNotFoundError } from '../../domain/errors';
import {
  LivestockReaderPort,
  UserReaderPort,
  WeightRecordRepositoryPort,
} from '../weight-record.ports';
import {
  CreateWeightRecordData,
  CreateWeightRecordInput,
  WeightRecordRecord,
} from '../weight-record.types';
import {
  assertRequiredString,
  normalizeRequiredDate,
} from '../weight-record.validation';

export class CreateWeightRecordUseCase {
  constructor(
    private readonly repository: WeightRecordRepositoryPort,
    private readonly livestockReader: LivestockReaderPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(data: CreateWeightRecordInput): Promise<WeightRecordRecord> {
    const livestockId = assertRequiredString(data.livestockId, 'livestockId');
    const operatorId = assertRequiredString(data.operatorId, 'operatorId');
    const measuredAt = normalizeRequiredDate(data.measuredAt, 'measuredAt');

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

    const createData: CreateWeightRecordData = {
      livestockId,
      operatorId,
      weight: data.weight,
      measuredAt,
    };

    return this.repository.create(createData);
  }
}
