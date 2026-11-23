import { Module } from '@nestjs/common';
import { GetUsdOfficialUseCase } from '../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import { ExchangeRateModule } from '../../integrations/exchange-rate/exchange-rate.module';
import { GetGrainPricesUseCase } from '../../integrations/grain-price/application/use-cases/get-grain-prices.use-case';
import { GrainPriceModule } from '../../integrations/grain-price/grain-price.module';
import { IntegrationsMarketPriceAdapter } from './adapters/outbound/integrations-market-price.adapter';
import {
  MARKET_PRICE,
  MarketPricePort,
} from './application/ports/market-price.port';
import { GetMarketSnapshotUseCase } from './application/use-cases/get-market-snapshot.use-case';
import { ValueMoneyUseCase } from './application/use-cases/value-money.use-case';

/**
 * Composition root del nucleo de valuacion. Sin controllers: solo exporta casos
 * de uso para que otros modulos los consuman por puertos propios.
 * (PrismaModule se agrega en la Unidad 2, cuando aparezcan los repositorios.)
 */
@Module({
  imports: [GrainPriceModule, ExchangeRateModule],
  providers: [
    {
      provide: MARKET_PRICE,
      useFactory: (grains: GetGrainPricesUseCase, usd: GetUsdOfficialUseCase) =>
        new IntegrationsMarketPriceAdapter(grains, usd),
      inject: [GetGrainPricesUseCase, GetUsdOfficialUseCase],
    },
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
  ],
  exports: [ValueMoneyUseCase, GetMarketSnapshotUseCase],
})
export class ValuationModule {}
