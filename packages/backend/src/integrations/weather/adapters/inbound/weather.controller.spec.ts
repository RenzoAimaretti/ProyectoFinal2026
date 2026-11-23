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
  InvalidInputError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { GetWeatherUseCase } from '../../application/use-cases/get-weather.use-case';
import { WeatherController } from './weather.controller';

const weatherOutput = {
  source: 'open-meteo+rainviewer' as const,
  location: {
    lat: -33.13,
    lon: -64.35,
    resolvedFrom: 'coordinates' as const,
    lotId: null,
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

describe('WeatherController', () => {
  let controller: WeatherController;
  let getWeather: jest.Mocked<GetWeatherUseCase>;

  beforeEach(() => {
    getWeather = { execute: jest.fn() } as unknown as jest.Mocked<GetWeatherUseCase>;
    controller = new WeatherController(getWeather);
  });

  it('protects the route with JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      WeatherController.prototype.current,
    ) as Array<new (...args: never[]) => unknown> | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('maps the query to the use-case input, selecting only lat and lon', async () => {
    getWeather.execute.mockResolvedValue(weatherOutput);

    const output = await controller.current({
      lat: '-33.13',
      lon: '-64.35',
      tenantId: 'tenant-should-be-ignored',
    });

    expect(output).toEqual(weatherOutput);
    expect(getWeather.execute).toHaveBeenCalledWith({
      lat: '-33.13',
      lon: '-64.35',
    });
  });

  it('maps domain errors to HTTP exceptions', async () => {
    getWeather.execute.mockRejectedValueOnce(
      new InvalidInputError('lat must be a finite number between -90 and 90'),
    );
    await expect(controller.current({ lat: 'nope', lon: '-64.35' })).rejects.toThrow(
      BadRequestException,
    );

    getWeather.execute.mockRejectedValueOnce(
      new EntityNotFoundError('Location not found'),
    );
    await expect(controller.current({ lat: '-33.13', lon: '-64.35' })).rejects.toThrow(
      NotFoundException,
    );

    getWeather.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );
    await expect(controller.current({ lat: '-33.13', lon: '-64.35' })).rejects.toThrow(
      ServiceUnavailableException,
    );

    getWeather.execute.mockRejectedValueOnce(
      new UpstreamError(500, 'https://api.open-meteo.com/v1/forecast'),
    );
    await expect(controller.current({ lat: '-33.13', lon: '-64.35' })).rejects.toThrow(
      BadGatewayException,
    );

    getWeather.execute.mockRejectedValueOnce(
      new UpstreamParseError('Open-Meteo payload is not an object'),
    );
    await expect(controller.current({ lat: '-33.13', lon: '-64.35' })).rejects.toThrow(
      BadGatewayException,
    );
  });
});
