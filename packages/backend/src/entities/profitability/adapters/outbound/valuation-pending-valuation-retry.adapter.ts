import { Logger } from '@nestjs/common';
import { RetryPendingValuationsUseCase } from '../../../valuation/application/use-cases/retry-pending-valuations.use-case';
import { PendingValuationRetryPort } from '../../application/ports/pending-valuation-retry.port';

/**
 * Consumer port of `profitability` over the exported `valuation` use case: it
 * values the company's pending reports when the calculator opens (R-FIN-07 b).
 * Best effort: any error is logged here and never reaches the calculator.
 */
export class ValuationPendingValuationRetryAdapter implements PendingValuationRetryPort {
  private readonly logger = new Logger(
    ValuationPendingValuationRetryAdapter.name,
  );

  constructor(private readonly retryPending: RetryPendingValuationsUseCase) {}

  async retry(companyId: string): Promise<void> {
    try {
      const result = await this.retryPending.execute({ companyId });

      for (const failure of result.failures) {
        this.logger.error(
          `Pending valuation retry failed for report ${failure.reportId}: ${describe(failure.error)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Pending valuation retry failed for company ${companyId}: ${describe(error)}`,
      );
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
