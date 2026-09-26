import { DailyReportRepositoryPort } from '../daily-report.ports';
import { DailyReportRecord } from '../daily-report.types';
import { assertRequiredString } from '../daily-report.validation';

export class FindDailyReportsByCompanyUseCase {
  constructor(private readonly repository: DailyReportRepositoryPort) {}

  async execute(companyId: string): Promise<DailyReportRecord[]> {
    const company = assertRequiredString(companyId, 'companyId');

    return this.repository.findAllByCompany(company);
  }
}
