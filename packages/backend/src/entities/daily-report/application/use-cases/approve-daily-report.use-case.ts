import {
  EntityNotFoundError,
  InvalidRelationError,
} from '../../domain/errors';
import { assertPendingApproval } from '../../domain/daily-report.rules';
import {
  ClockPort,
  DailyReportApprovalPort,
  DailyReportClientReaderPort,
  DailyReportRepositoryPort,
} from '../daily-report.ports';
import { DailyReportRecord } from '../daily-report.types';
import { assertRequiredString } from '../daily-report.validation';

/**
 * Approving a daily report consumes the stock of the client that owns the
 * worked lot: the quantities loaded in the report reduce the client balance,
 * and the approval is refused when that balance cannot cover them (R017).
 */
export class ApproveDailyReportUseCase {
  constructor(
    private readonly repository: DailyReportRepositoryPort,
    private readonly clientReader: DailyReportClientReaderPort,
    private readonly approval: DailyReportApprovalPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    companyId: string,
    reportId: string,
    approvedBy: string,
  ): Promise<DailyReportRecord> {
    const company = assertRequiredString(companyId, 'companyId');
    const id = assertRequiredString(reportId, 'reportId');
    const approver = assertRequiredString(approvedBy, 'approvedBy');

    const report = await this.repository.findByIdForCompany(id, company);
    if (!report) {
      throw new EntityNotFoundError(`Daily report with id ${id} not found`);
    }

    assertPendingApproval(report.status);

    const clientId = await this.clientReader.findClientIdByLotId(report.lotId);
    if (!clientId) {
      throw new InvalidRelationError(
        `Lot with id ${report.lotId} is not linked to a client`,
      );
    }

    return this.approval.approveWithStockDeduction({
      id: report.id,
      companyId: company,
      clientId,
      approvedBy: approver,
      approvedAt: this.clock.now(),
    });
  }
}
