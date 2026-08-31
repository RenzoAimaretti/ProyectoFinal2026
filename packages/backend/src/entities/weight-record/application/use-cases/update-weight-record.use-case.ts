import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
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
    companyIdOrData?: string | UpdateWeightRecordInput,
    maybeData?: UpdateWeightRecordInput,
  ): Promise<WeightRecordRecord> {
    const hasCompanyScope = typeof companyIdOrData === 'string';
    const companyId = hasCompanyScope ? companyIdOrData : undefined;
    const data = hasCompanyScope ? maybeData : companyIdOrData;

    if (!data || Object.values(data).every((value) => value === undefined)) {
      throw new InvalidInputError('No data provided for update');
    }

    const record = companyId
      ? await this.repository.findByIdForCompany(id, companyId)
      : await this.repository.findById(id);
    if (!record) {
      throw new EntityNotFoundError(`Weight record with id ${id} not found`);
    }

    if (data.operatorId !== undefined) {
      const operatorId = assertRequiredString(data.operatorId, 'operatorId');
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

    return companyId
      ? this.repository.updateForCompany(id, companyId, updateData)
      : this.repository.update(id, updateData);
  }
}
