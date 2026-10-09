import { InvalidRelationError } from '../../domain/errors';
import { LotReaderPort, TaskRepositoryPort, LaborTypeReaderPort } from '../task.ports';
import { CreateTaskInput, TaskOutput } from '../task.types';
import {
  assertRequiredString,
  normalizeRequiredDate,
} from '../task.validation';

export class CreateTaskUseCase {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly lotReader: LotReaderPort,
    private readonly laborTypeReader: LaborTypeReaderPort,
  ) {}

  async execute(tenantId: string, input: CreateTaskInput): Promise<TaskOutput> {
    const lotId = assertRequiredString(input?.lotId, 'lotId');
    const laborTypeId = assertRequiredString(input?.laborTypeId, 'laborTypeId');
    const startedAt = normalizeRequiredDate(input?.startedAt, 'startedAt');

    const lot = await this.lotReader.findByIdForTenant(lotId, tenantId);
    if (!lot) {
      throw new InvalidRelationError(`Lot with id ${lotId} does not belong to company ${tenantId}`);
    }

    const laborType = await this.laborTypeReader.findByIdForTenant(laborTypeId, tenantId);
    if (!laborType) {
      throw new InvalidRelationError(
        `Labor type with id ${laborTypeId} does not belong to company ${tenantId}`,
      );
    }

    return this.repository.create({
      lotId,
      laborTypeId,
      startedAt,
    });
  }
}
