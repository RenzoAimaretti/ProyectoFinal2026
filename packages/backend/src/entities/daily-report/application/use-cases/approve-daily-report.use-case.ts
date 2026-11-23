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
  DailyReportValuationHookPort,
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
    private readonly valuationHook: DailyReportValuationHookPort,
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

    const approvedAt = this.clock.now();
    const approved = await this.approval.approveWithStockDeduction({
      id: report.id,
      companyId: company,
      clientId,
      approvedBy: approver,
      approvedAt,
    });

    // The approval transaction is already committed. Valuation is best effort:
    // the hook contract says it never throws, and this guard keeps a violating
    // implementation from changing the approval answer (R017 contract).
    try {
      await this.valuationHook.onApproved({
        companyId: company,
        reportId: approved.id,
        approvedAt: approved.approvedAt ?? approvedAt,
      });
    } catch {
      // Intentionally ignored: the report stays approved and unvalued.
    }

    return approved;
  }
}
