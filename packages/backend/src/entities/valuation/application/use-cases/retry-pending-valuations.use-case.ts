import {
  UsdRateType,
  VALUATION_USD_RATE_TYPE,
} from '../../domain/valuation-rate-policy';
import { ReportValuator } from '../report-valuator';
import { ClockPort } from '../ports/clock.port';
import { DailyReportReaderPort } from '../ports/daily-report-reader.port';
import { MarketPricePort } from '../ports/market-price.port';
import { TariffReaderPort } from '../ports/tariff-reader.port';
import { ValuationRepositoryPort } from '../ports/valuation-repository.port';

/** Reports retried per invocation (assumption; see design 2.6). */
export const DEFAULT_RETRY_LIMIT = 200;

export interface RetryPendingValuationsInput {
  companyId: string;
  /** Restricts the retry to one labor type. */
  laborTypeId?: string;
  limit?: number;
}

export interface RetryFailure {
  reportId: string;
  error: unknown;
}

export interface RetryPendingValuationsOutput {
  processed: number;
  valued: number;
  withoutTariff: number;
  priceUnavailable: number;
  alreadyValued: number;
  /** Unexpected errors; the adapter that triggered the retry logs them. */
  failures: RetryFailure[];
}

/**
 * Values approved reports that still have no snapshot (origin REINTENTO, a late
 * valuation). Idempotent: a snapshot that appeared meanwhile is counted as
 * already valued, never as an error. One failing report does not stop the rest.
 */
export class RetryPendingValuationsUseCase {
  private readonly valuator: ReportValuator;

  constructor(
    tariffs: TariffReaderPort,
    private readonly reports: DailyReportReaderPort,
    market: MarketPricePort,
    repository: ValuationRepositoryPort,
    clock: ClockPort,
    rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
  ) {
    this.valuator = new ReportValuator(
      tariffs,
      market,
      repository,
      clock,
      rateType,
    );
  }

  async execute(
    input: RetryPendingValuationsInput,
  ): Promise<RetryPendingValuationsOutput> {
    const pending = await this.reports.findApprovedWithoutValuation({
      companyId: input.companyId,
      ...(input.laborTypeId !== undefined
        ? { laborTypeId: input.laborTypeId }
        : {}),
      limit: input.limit ?? DEFAULT_RETRY_LIMIT,
    });

    const output: RetryPendingValuationsOutput = {
      processed: pending.length,
      valued: 0,
      withoutTariff: 0,
      priceUnavailable: 0,
      alreadyValued: 0,
      failures: [],
    };

    for (const report of pending) {
      try {
        const result = await this.valuator.valuate(report, 'REINTENTO');
        if (result === 'VALUADO') output.valued += 1;
        else if (result === 'SIN_TARIFA') output.withoutTariff += 1;
        else if (result === 'PRECIO_NO_DISPONIBLE')
          output.priceUnavailable += 1;
        else output.alreadyValued += 1;
      } catch (error) {
        output.failures.push({ reportId: report.id, error });
      }
    }

    return output;
  }
}
