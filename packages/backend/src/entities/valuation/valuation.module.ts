import { Module } from '@nestjs/common';
import { GetUsdOfficialUseCase } from '../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import { ExchangeRateModule } from '../../integrations/exchange-rate/exchange-rate.module';
import { GetGrainPricesUseCase } from '../../integrations/grain-price/application/use-cases/get-grain-prices.use-case';
import { GrainPriceModule } from '../../integrations/grain-price/grain-price.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsMarketPriceAdapter } from './adapters/outbound/integrations-market-price.adapter';
import { PrismaDailyReportReader } from './adapters/outbound/prisma-daily-report.reader';
import { PrismaTariffReader } from './adapters/outbound/prisma-tariff.reader';
import { PrismaValuationRepository } from './adapters/outbound/prisma-valuation.repository';
import { SystemClock } from './adapters/outbound/system-clock';
import { CLOCK, ClockPort } from './application/ports/clock.port';
import {
  DAILY_REPORT_READER,
  DailyReportReaderPort,
} from './application/ports/daily-report-reader.port';
import {
  MARKET_PRICE,
  MarketPricePort,
} from './application/ports/market-price.port';
import {
  TARIFF_READER,
  TariffReaderPort,
} from './application/ports/tariff-reader.port';
import {
  VALUATION_REPOSITORY,
  ValuationRepositoryPort,
} from './application/ports/valuation-repository.port';
import { GetMarketSnapshotUseCase } from './application/use-cases/get-market-snapshot.use-case';
import { RetryPendingValuationsUseCase } from './application/use-cases/retry-pending-valuations.use-case';
import { ValuateDailyReportUseCase } from './application/use-cases/valuate-daily-report.use-case';
import { ValueMoneyUseCase } from './application/use-cases/value-money.use-case';

/**
 * Composition root of the valuation core. No controllers: it exports use cases
 * that other modules consume through their own ports. It reads daily reports
 * through its own Prisma reader and never imports DailyReportModule (that
 * module imports this one), so there is no cycle.
 */
@Module({
  imports: [PrismaModule, GrainPriceModule, ExchangeRateModule],
  providers: [
    {
      provide: MARKET_PRICE,
      useFactory: (grains: GetGrainPricesUseCase, usd: GetUsdOfficialUseCase) =>
        new IntegrationsMarketPriceAdapter(grains, usd),
      inject: [GetGrainPricesUseCase, GetUsdOfficialUseCase],
    },
    {
      provide: TARIFF_READER,
      useFactory: (prisma: PrismaService) => new PrismaTariffReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: DAILY_REPORT_READER,
      useFactory: (prisma: PrismaService) =>
        new PrismaDailyReportReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: VALUATION_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaValuationRepository(prisma),
      inject: [PrismaService],
    },
    { provide: CLOCK, useFactory: () => new SystemClock() },
    {
      provide: ValueMoneyUseCase,
      useFactory: (market: MarketPricePort) => new ValueMoneyUseCase(market),
      inject: [MARKET_PRICE],
    },
    {
      provide: GetMarketSnapshotUseCase,
      useFactory: (market: MarketPricePort) =>
        new GetMarketSnapshotUseCase(market),
      inject: [MARKET_PRICE],
    },
    {
      provide: ValuateDailyReportUseCase,
      useFactory: (
        tariffs: TariffReaderPort,
        reports: DailyReportReaderPort,
        market: MarketPricePort,
        repository: ValuationRepositoryPort,
        clock: ClockPort,
      ) =>
        new ValuateDailyReportUseCase(
          tariffs,
          reports,
          market,
          repository,
          clock,
        ),
      inject: [
        TARIFF_READER,
        DAILY_REPORT_READER,
        MARKET_PRICE,
        VALUATION_REPOSITORY,
        CLOCK,
      ],
    },
    {
      provide: RetryPendingValuationsUseCase,
      useFactory: (
        tariffs: TariffReaderPort,
        reports: DailyReportReaderPort,
        market: MarketPricePort,
        repository: ValuationRepositoryPort,
        clock: ClockPort,
      ) =>
        new RetryPendingValuationsUseCase(
          tariffs,
          reports,
          market,
          repository,
          clock,
        ),
      inject: [
        TARIFF_READER,
        DAILY_REPORT_READER,
        MARKET_PRICE,
        VALUATION_REPOSITORY,
        CLOCK,
      ],
    },
  ],
  exports: [
    ValueMoneyUseCase,
    GetMarketSnapshotUseCase,
    ValuateDailyReportUseCase,
    RetryPendingValuationsUseCase,
  ],
})
export class ValuationModule {}
