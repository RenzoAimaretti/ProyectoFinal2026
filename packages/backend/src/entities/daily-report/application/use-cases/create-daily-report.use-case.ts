import {
  EntityNotFoundError,
  InvalidRelationError,
} from '../../domain/errors';
import { DAILY_REPORT_INITIAL_STATUS } from '../../domain/daily-report-status';
import { assertPositiveNumber } from '../../domain/daily-report.rules';
import {
  DailyReportCompanyReaderPort,
  DailyReportInputReaderPort,
  DailyReportRepositoryPort,
  DailyReportTaskReaderPort,
} from '../daily-report.ports';
import {
  CreateDailyReportInput,
  DailyReportRecord,
} from '../daily-report.types';
import {
  assertRequiredDate,
  assertRequiredString,
  normalizeDailyReportItems,
} from '../daily-report.validation';

export class CreateDailyReportUseCase {
  constructor(
    private readonly repository: DailyReportRepositoryPort,
    private readonly companyReader: DailyReportCompanyReaderPort,
    private readonly taskReader: DailyReportTaskReaderPort,
    private readonly inputReader: DailyReportInputReaderPort,
  ) {}

  async execute(
    companyId: string,
    data: CreateDailyReportInput,
  ): Promise<DailyReportRecord> {
    const company = assertRequiredString(companyId, 'companyId');
    const operatorId = assertRequiredString(data.operatorId, 'operatorId');
    const taskId = assertRequiredString(data.taskId, 'taskId');
    const date = assertRequiredDate(data.date, 'date');
    const hectares = assertPositiveNumber(data.hectares, 'hectares');
    const hours = assertPositiveNumber(data.hours, 'hours');
    const items = normalizeDailyReportItems(data.items);
    const id =
      data.id === undefined ? undefined : assertRequiredString(data.id, 'id');

    const companyRecord = await this.companyReader.findById(company);
    if (!companyRecord) {
      throw new InvalidRelationError(`Company with id ${company} not found`);
    }

    const task = await this.taskReader.findByIdWithScope(taskId);
    if (!task) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    if (task.tenantId !== companyRecord.tenantId) {
      throw new InvalidRelationError(
        'The referenced task must belong to the same tenant as the company',
      );
    }

    const inputIds = items.map((item) => item.inputId);
    const existingInputIds = await this.inputReader.findExistingIdsForTenant(
      inputIds,
      companyRecord.tenantId,
    );
    const existing = new Set(existingInputIds);
    const missingInputIds = inputIds.filter((id) => !existing.has(id));

    if (missingInputIds.length > 0) {
      throw new EntityNotFoundError(
        `Daily report inputs do not belong to the company tenant: ${missingInputIds.join(', ')}`,
      );
    }

    return this.repository.create({
      id,
      operatorId,
      companyId: company,
      taskId: task.id,
      lotId: task.lotId,
      taskTypeId: task.taskTypeId,
      date,
      hectares,
      hours,
      status: DAILY_REPORT_INITIAL_STATUS,
      items,
    });
  }
}
