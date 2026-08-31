import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
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

  async execute(
    companyIdOrData: string | CreateWeightRecordInput,
    maybeData?: CreateWeightRecordInput,
  ): Promise<WeightRecordRecord> {
    const hasCompanyScope = typeof companyIdOrData === 'string';
    const companyId = hasCompanyScope ? companyIdOrData : undefined;
    const data = hasCompanyScope ? maybeData : companyIdOrData;

    if (!data) {
      throw new InvalidRelationError('Create weight record requires input data');
    }

    const livestockId = assertRequiredString(data.livestockId, 'livestockId');
    const operatorId = assertRequiredString(data.operatorId, 'operatorId');
    const measuredAt = normalizeRequiredDate(data.measuredAt, 'measuredAt');

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

      throw new EntityNotFoundError(
        `Livestock with id ${livestockId} not found`,
      );
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

    const createData: CreateWeightRecordData = {
      livestockId,
      operatorId,
      weight: data.weight,
      measuredAt,
    };

    return this.repository.create(createData);
  }
}
