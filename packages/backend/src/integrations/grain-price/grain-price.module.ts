import { Module } from '@nestjs/common';
import { IntegrationsSharedModule } from '../shared/integrations-shared.module';
import { CACHE, CachePort } from '../shared/application/ports/cache.ports';
import { CLOCK, ClockPort } from '../shared/application/ports/clock.ports';
import { GetGrainPricesUseCase } from './application/use-cases/get-grain-prices.use-case';
import {
  GRAIN_PRICE_PROVIDER,
  GrainPriceProviderPort,
} from './application/grain-price.ports';
import { GrainPriceController } from './adapters/inbound/grain-price.controller';
import { BcrGrainPriceProvider } from './adapters/outbound/bcr-grain-price.provider';

@Module({
  imports: [IntegrationsSharedModule],
  controllers: [GrainPriceController],
  providers: [
    BcrGrainPriceProvider,
    { provide: GRAIN_PRICE_PROVIDER, useExisting: BcrGrainPriceProvider },
    {
      provide: GetGrainPricesUseCase,
      useFactory: (
        cache: CachePort,
        clock: ClockPort,
        provider: GrainPriceProviderPort,
      ) => new GetGrainPricesUseCase(cache, clock, provider),
      inject: [CACHE, CLOCK, GRAIN_PRICE_PROVIDER],
    },
  ],
  exports: [GetGrainPricesUseCase],
})
export class GrainPriceModule {}
