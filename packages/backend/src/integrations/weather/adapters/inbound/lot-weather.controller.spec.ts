import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  EntityNotFoundError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { WeatherLocationUnresolvedError } from '../../domain/errors';
import { GetLotWeatherUseCase } from '../../application/use-cases/get-lot-weather.use-case';
import { LotWeatherController } from './lot-weather.controller';

const weatherOutput = {
  source: 'open-meteo+rainviewer' as const,
  location: {
    lat: -33.13,
    lon: -64.35,
    resolvedFrom: 'lot' as const,
    lotId: 'lot-1',
    usedFarmFallback: false,
  },
  current: {
    temperatureC: 18.4,
    windSpeedKnots: 5.1,
    windDirectionDeg: 155,
    precipitationMm: 0,
  },
  hourly: [],
  daily: [],
  radar: null,
  stale: false,
  fetchedAt: '2026-10-15T15:00:00.000Z',
};

const req = { user: { tenantId: 'tenant-1' } };

describe('LotWeatherController', () => {
  let controller: LotWeatherController;
  let getLotWeather: jest.Mocked<GetLotWeatherUseCase>;

  beforeEach(() => {
    getLotWeather = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetLotWeatherUseCase>;
    controller = new LotWeatherController(getLotWeather);
  });

  it('protects the route with JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      LotWeatherController.prototype.findByLot,
    ) as Array<new (...args: never[]) => unknown> | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('takes the tenant from the JWT and the lot id from the path', async () => {
    getLotWeather.execute.mockResolvedValue(weatherOutput);

    const output = await controller.findByLot('lot-1', req as never);

    expect(output).toEqual(weatherOutput);
    expect(getLotWeather.execute).toHaveBeenCalledWith({
      lotId: 'lot-1',
      tenantId: 'tenant-1',
    });
  });

  it('maps a lot from another tenant to 404 without leaking its existence', async () => {
    getLotWeather.execute.mockRejectedValueOnce(
      new EntityNotFoundError('Lot with id lot-9 not found'),
    );

    await expect(
      controller.findByLot('lot-9', req as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps domain errors to HTTP exceptions', async () => {
    getLotWeather.execute.mockRejectedValueOnce(
      new WeatherLocationUnresolvedError(
        'No usable coordinates for lot lot-1 or its farm',
      ),
    );
    await expect(
      controller.findByLot('lot-1', req as never),
    ).rejects.toThrow(BadRequestException);

    getLotWeather.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );
    await expect(
      controller.findByLot('lot-1', req as never),
    ).rejects.toThrow(ServiceUnavailableException);

    getLotWeather.execute.mockRejectedValueOnce(
      new UpstreamParseError('Open-Meteo payload is not an object'),
    );
    await expect(
      controller.findByLot('lot-1', req as never),
    ).rejects.toThrow(BadGatewayException);

    getLotWeather.execute.mockRejectedValueOnce(
      new UpstreamError(500, 'https://api.open-meteo.com/v1/forecast'),
    );
    await expect(
      controller.findByLot('lot-1', req as never),
    ).rejects.toThrow(BadGatewayException);
  });
});
