import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsSharedModule } from '../shared/integrations-shared.module';
import { GetLotWeatherUseCase } from './application/use-cases/get-lot-weather.use-case';
import { GetWeatherUseCase } from './application/use-cases/get-weather.use-case';
import {
  LOT_LOCATION_READER,
  LotLocationReaderPort,
  RADAR_PROVIDER,
  RadarProviderPort,
  WEATHER_PROVIDER,
  WeatherProviderPort,
} from './application/weather.ports';
import { CACHE, CachePort } from '../shared/application/ports/cache.ports';
import { CLOCK, ClockPort } from '../shared/application/ports/clock.ports';
import { LotWeatherController } from './adapters/inbound/lot-weather.controller';
import { WeatherController } from './adapters/inbound/weather.controller';
import { OpenMeteoWeatherProvider } from './adapters/outbound/open-meteo.weather.provider';
import { PrismaLotLocationReader } from './adapters/outbound/prisma-lot-location.reader';
import { RainViewerRadarProvider } from './adapters/outbound/rainviewer.radar.provider';

@Module({
  imports: [IntegrationsSharedModule, PrismaModule],
  controllers: [WeatherController, LotWeatherController],
  providers: [
    OpenMeteoWeatherProvider,
    RainViewerRadarProvider,
    PrismaLotLocationReader,
    { provide: WEATHER_PROVIDER, useExisting: OpenMeteoWeatherProvider },
    { provide: RADAR_PROVIDER, useExisting: RainViewerRadarProvider },
    { provide: LOT_LOCATION_READER, useExisting: PrismaLotLocationReader },
    {
      provide: GetWeatherUseCase,
      useFactory: (
        cache: CachePort,
        clock: ClockPort,
        weatherProvider: WeatherProviderPort,
        radarProvider: RadarProviderPort,
      ) =>
        new GetWeatherUseCase(cache, clock, weatherProvider, radarProvider),
      inject: [CACHE, CLOCK, WEATHER_PROVIDER, RADAR_PROVIDER],
    },
    {
      provide: GetLotWeatherUseCase,
      useFactory: (
        locationReader: LotLocationReaderPort,
        getWeather: GetWeatherUseCase,
      ) => new GetLotWeatherUseCase(locationReader, getWeather),
      inject: [LOT_LOCATION_READER, GetWeatherUseCase],
    },
  ],
  exports: [GetWeatherUseCase, GetLotWeatherUseCase],
})
export class WeatherModule {}
