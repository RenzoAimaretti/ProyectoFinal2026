import { EntityNotFoundError } from '../../domain/errors';
import {
  UsdRateType,
  VALUATION_USD_RATE_TYPE,
} from '../../domain/valuation-rate-policy';
import { ReportValuator, ValuationOutcome } from '../report-valuator';
import { ClockPort } from '../ports/clock.port';
import { DailyReportReaderPort } from '../ports/daily-report-reader.port';
import { MarketPricePort } from '../ports/market-price.port';
import { TariffReaderPort } from '../ports/tariff-reader.port';
import { ValuationRepositoryPort } from '../ports/valuation-repository.port';

export interface ValuateDailyReportInput {
  companyId: string;
  reportId: string;
}

export interface ValuateDailyReportOutput {
  reportId: string;
  result: ValuationOutcome;
}

/**
 * Values one approved report right after its approval (origin APROBACION).
 * A report without tariff or without prices is not an error: it stays unvalued
 * and the retry picks it up later.
 */
export class ValuateDailyReportUseCase {
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
    input: ValuateDailyReportInput,
  ): Promise<ValuateDailyReportOutput> {
    const report = await this.reports.findApprovedById(
      input.companyId,
      input.reportId,
    );
    if (!report) {
      throw new EntityNotFoundError(
        `Approved daily report ${input.reportId} not found`,
      );
    }

    const result = await this.valuator.valuate(report, 'APROBACION');
    return { reportId: report.id, result };
  }
}
