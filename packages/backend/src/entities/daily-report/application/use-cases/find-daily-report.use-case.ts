import { EntityNotFoundError } from '../../domain/errors';
import { DailyReportRepositoryPort } from '../daily-report.ports';
import { DailyReportRecord } from '../daily-report.types';
import { assertRequiredString } from '../daily-report.validation';

export class FindDailyReportUseCase {
  constructor(private readonly repository: DailyReportRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<DailyReportRecord> {
    const reportId = assertRequiredString(id, 'id');
    const company = assertRequiredString(companyId, 'companyId');

    const report = await this.repository.findByIdForCompany(
      reportId,
      company,
    );

    if (!report) {
      throw new EntityNotFoundError(
        `Daily report with id ${reportId} not found`,
      );
    }

    return report;
  }
}
