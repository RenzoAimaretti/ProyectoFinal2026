import { Injectable, Logger } from '@nestjs/common';
import { ValuateDailyReportUseCase } from '../../../valuation/application/use-cases/valuate-daily-report.use-case';
import { DailyReportValuationHookPort } from '../../application/daily-report.ports';

/**
 * Post-approval hook over the exported `valuation` use case. It honours the
 * port contract: it never throws. Any error is logged here and the report just
 * stays unvalued (a later retry will pick it up).
 */
@Injectable()
export class ValuationDailyReportHookAdapter implements DailyReportValuationHookPort {
  private readonly logger = new Logger(ValuationDailyReportHookAdapter.name);

  constructor(private readonly valuate: ValuateDailyReportUseCase) {}

  async onApproved(input: {
    companyId: string;
    reportId: string;
    approvedAt: Date;
  }): Promise<void> {
    try {
      const { result } = await this.valuate.execute({
        companyId: input.companyId,
        reportId: input.reportId,
      });

      if (result === 'SIN_TARIFA' || result === 'PRECIO_NO_DISPONIBLE') {
        this.logger.warn(
          `Daily report ${input.reportId} left unvalued: ${result}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Valuation of approved daily report ${input.reportId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
