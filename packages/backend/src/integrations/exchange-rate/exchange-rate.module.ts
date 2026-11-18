import { Module } from '@nestjs/common';
import { IntegrationsSharedModule } from '../shared/integrations-shared.module';
import { CACHE, CachePort } from '../shared/application/ports/cache.ports';
import { CLOCK, ClockPort } from '../shared/application/ports/clock.ports';
import { GetUsdOfficialUseCase } from './application/use-cases/get-usd-official.use-case';
import {
  EXCHANGE_RATE_PROVIDER,
  ExchangeRateProviderPort,
} from './application/exchange-rate.ports';
import { ExchangeRateController } from './adapters/inbound/exchange-rate.controller';
import { DolarApiExchangeRateProvider } from './adapters/outbound/dolarapi.exchange-rate.provider';

@Module({
  imports: [IntegrationsSharedModule],
  controllers: [ExchangeRateController],
  providers: [
    DolarApiExchangeRateProvider,
    {
      provide: EXCHANGE_RATE_PROVIDER,
      useExisting: DolarApiExchangeRateProvider,
    },
    {
      provide: GetUsdOfficialUseCase,
      useFactory: (
        cache: CachePort,
        clock: ClockPort,
        provider: ExchangeRateProviderPort,
      ) => new GetUsdOfficialUseCase(cache, clock, provider),
      inject: [CACHE, CLOCK, EXCHANGE_RATE_PROVIDER],
    },
  ],
  exports: [GetUsdOfficialUseCase],
})
export class ExchangeRateModule {}
