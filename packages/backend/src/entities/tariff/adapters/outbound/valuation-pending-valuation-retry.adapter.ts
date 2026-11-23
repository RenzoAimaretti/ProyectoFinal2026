import { Logger } from '@nestjs/common';
import { RetryPendingValuationsUseCase } from '../../../valuation/application/use-cases/retry-pending-valuations.use-case';
import {
  PendingValuationRetryInput,
  PendingValuationRetryPort,
} from '../../application/ports/pending-valuation-retry.port';

/**
 * Consumer port of `tariff` over the exported `valuation` use case. Best
 * effort: any error is logged here and never reaches the tariff save.
 */
export class ValuationPendingValuationRetryAdapter implements PendingValuationRetryPort {
  private readonly logger = new Logger(
    ValuationPendingValuationRetryAdapter.name,
  );

  constructor(private readonly retryPending: RetryPendingValuationsUseCase) {}

  async retry(input: PendingValuationRetryInput): Promise<void> {
    try {
      const result = await this.retryPending.execute({
        companyId: input.companyId,
        laborTypeId: input.laborTypeId,
      });

      for (const failure of result.failures) {
        this.logger.error(
          `Pending valuation retry failed for report ${failure.reportId}: ${describe(failure.error)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Pending valuation retry failed for company ${input.companyId}, labor ${input.laborTypeId}: ${describe(error)}`,
      );
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
