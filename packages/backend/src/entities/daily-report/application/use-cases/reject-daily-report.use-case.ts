import { EntityNotFoundError } from '../../domain/errors';
import {
  assertPendingApproval,
  assertRejectionReason,
} from '../../domain/daily-report.rules';
import { DailyReportRepositoryPort } from '../daily-report.ports';
import { DailyReportRecord } from '../daily-report.types';
import { assertRequiredString } from '../daily-report.validation';

/**
 * Rejecting a daily report is the terminal decision that does not consume
 * stock. It only records the auditable reason over a pending report that is
 * scoped to its company, mirroring reception rejection (R017).
 */
export class RejectDailyReportUseCase {
  constructor(private readonly repository: DailyReportRepositoryPort) {}

  async execute(
    companyId: string,
    reportId: string,
    rejectionReason: string,
  ): Promise<DailyReportRecord> {
    const company = assertRequiredString(companyId, 'companyId');
    const id = assertRequiredString(reportId, 'reportId');
    const reason = assertRejectionReason(rejectionReason);

    const report = await this.repository.findByIdForCompany(id, company);
    if (!report) {
      throw new EntityNotFoundError(`Daily report with id ${id} not found`);
    }

    assertPendingApproval(report.status);

    return this.repository.reject({
      id: report.id,
      companyId: company,
      rejectionReason: reason,
    });
  }
}
