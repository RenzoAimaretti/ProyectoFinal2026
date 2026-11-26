import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { GetMarketSnapshotUseCase } from '../valuation/application/use-cases/get-market-snapshot.use-case';
import { RetryPendingValuationsUseCase } from '../valuation/application/use-cases/retry-pending-valuations.use-case';
import { ValuationModule } from '../valuation/valuation.module';
import { ProfitabilityController } from './adapters/inbound/profitability.controller';
import { PrismaProfitabilityReader } from './adapters/outbound/prisma-profitability.reader';
import { SystemClock } from './adapters/outbound/system-clock';
import { ValuationMarketSnapshotAdapter } from './adapters/outbound/valuation-market-snapshot.adapter';
import { ValuationPendingValuationRetryAdapter } from './adapters/outbound/valuation-pending-valuation-retry.adapter';
import { CLOCK, ClockPort } from './application/ports/clock.port';
import {
  MARKET_SNAPSHOT,
  MarketSnapshotPort,
} from './application/ports/market-snapshot.port';
import {
  PENDING_VALUATION_RETRY,
  PendingValuationRetryPort,
} from './application/ports/pending-valuation-retry.port';
import {
  PROFITABILITY_READER,
  ProfitabilityReaderPort,
} from './application/ports/profitability-reader.port';
import { GetLotProfitabilityDetailUseCase } from './application/use-cases/get-lot-profitability-detail.use-case';
import { GetLotProfitabilityListUseCase } from './application/use-cases/get-lot-profitability-list.use-case';

/** Composition root of the lot profitability calculator (R032, R033). */
@Module({
  imports: [PrismaModule, ValuationModule],
  controllers: [ProfitabilityController],
  providers: [
    {
      provide: PROFITABILITY_READER,
      useFactory: (prisma: PrismaService) =>
        new PrismaProfitabilityReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: PENDING_VALUATION_RETRY,
      useFactory: (retry: RetryPendingValuationsUseCase) =>
        new ValuationPendingValuationRetryAdapter(retry),
      inject: [RetryPendingValuationsUseCase],
    },
    {
      provide: MARKET_SNAPSHOT,
      useFactory: (snapshot: GetMarketSnapshotUseCase) =>
        new ValuationMarketSnapshotAdapter(snapshot),
      inject: [GetMarketSnapshotUseCase],
    },
    { provide: CLOCK, useFactory: () => new SystemClock() },
    {
      provide: GetLotProfitabilityListUseCase,
      useFactory: (
        reader: ProfitabilityReaderPort,
        retry: PendingValuationRetryPort,
        market: MarketSnapshotPort,
        clock: ClockPort,
      ) => new GetLotProfitabilityListUseCase(reader, retry, market, clock),
      inject: [
        PROFITABILITY_READER,
        PENDING_VALUATION_RETRY,
        MARKET_SNAPSHOT,
        CLOCK,
      ],
    },
    {
      provide: GetLotProfitabilityDetailUseCase,
      useFactory: (
        reader: ProfitabilityReaderPort,
        market: MarketSnapshotPort,
        clock: ClockPort,
      ) => new GetLotProfitabilityDetailUseCase(reader, market, clock),
      inject: [PROFITABILITY_READER, MARKET_SNAPSHOT, CLOCK],
    },
  ],
})
export class ProfitabilityModule {}
