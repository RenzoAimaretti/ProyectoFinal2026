import { EntityNotFoundError } from '../../../shared/domain/errors';
import { WeatherLocationUnresolvedError } from '../../domain/errors';
import { WeatherProviderPort, RadarProviderPort } from '../weather.ports';
import { WeatherOutput } from '../weather.types';
import { GetLotWeatherUseCase } from './get-lot-weather.use-case';
import { GetWeatherUseCase } from './get-weather.use-case';
import { InMemoryTtlCache } from '../../../shared/adapters/outbound/in-memory-ttl-cache';
import { ClockPort } from '../../../shared/application/ports/clock.ports';

class FixedClock implements ClockPort {
  now(): Date {
    return new Date('2026-10-15T15:00:00.000Z');
  }
}

const polygonalLot = {
  coords: JSON.stringify([
    [-33.1, -64.4],
    [-33.1, -64.3],
    [-33.2, -64.3],
    [-33.2, -64.4],
  ]),
  farmId: 'farm-1',
  farmLocation: 'Córdoba',
};

function createHarness() {
  const locationReader = {
    findByLotAndTenant: jest.fn(),
    centroidByFarmAndTenant: jest.fn(),
  };
  const weatherProvider: jest.Mocked<WeatherProviderPort> = {
    fetchCurrent: jest.fn().mockResolvedValue({
      current: {
        temperatureC: 18.4,
        windSpeedKnots: 5.1,
        windDirectionDeg: 155,
        precipitationMm: 0,
      },
      hourly: [],
      daily: [],
    }),
  };
  const radarProvider: jest.Mocked<RadarProviderPort> = {
    fetchRadar: jest.fn().mockResolvedValue({
      host: 'https://tilecache.rainviewer.com',
      frames: [{ time: '2026-10-15T15:50:00.000Z', path: '/v2/radar/abc123' }],
      tileTemplate:
        'https://tilecache.rainviewer.com/v2/radar/abc123/256/{z}/{x}/{y}/2/1_1.png',
      coverageWarning: true,
    }),
  };

  const getWeather = new GetWeatherUseCase(
    new InMemoryTtlCache(),
    new FixedClock(),
    weatherProvider,
    radarProvider,
  );

  return {
    useCase: new GetLotWeatherUseCase(locationReader, getWeather),
    locationReader,
    weatherProvider,
  };
}

describe('GetLotWeatherUseCase', () => {
  it('resolves the lot centroid and marks the location as resolved from the lot', async () => {
    const { useCase, locationReader, weatherProvider } = createHarness();
    locationReader.findByLotAndTenant.mockResolvedValue(polygonalLot);

    const output: WeatherOutput = await useCase.execute({
      lotId: 'lot-1',
      tenantId: 'tenant-1',
    });

    expect(locationReader.findByLotAndTenant).toHaveBeenCalledWith(
      'lot-1',
      'tenant-1',
    );
    expect(weatherProvider.fetchCurrent).toHaveBeenCalledWith({
      lat: -33.15,
      lon: -64.35,
    });
    expect(output.location.resolvedFrom).toBe('lot');
    expect(output.location.lotId).toBe('lot-1');
    expect(output.location.usedFarmFallback).toBe(false);
  });

  it('falls back to the farm centroid when the lot has no polygon', async () => {
    const { useCase, locationReader } = createHarness();
    locationReader.findByLotAndTenant.mockResolvedValue({
      ...polygonalLot,
      coords: null,
    });
    locationReader.centroidByFarmAndTenant.mockResolvedValue({
      lat: -33.2,
      lon: -64.4,
    });

    const output = await useCase.execute({
      lotId: 'lot-1',
      tenantId: 'tenant-1',
    });

    expect(locationReader.centroidByFarmAndTenant).toHaveBeenCalledWith(
      'farm-1',
      'tenant-1',
    );
    expect(output.location.resolvedFrom).toBe('farm');
    expect(output.location.usedFarmFallback).toBe(true);
    expect(output.location.lat).toBe(-33.2);
    expect(output.location.lon).toBe(-64.4);
  });

  it('treats an unreadable polygon as a missing one and falls back to the farm', async () => {
    const { useCase, locationReader } = createHarness();
    locationReader.findByLotAndTenant.mockResolvedValue({
      ...polygonalLot,
      coords: '{"type":"Polygon","coordinates":[[]]}',
    });
    locationReader.centroidByFarmAndTenant.mockResolvedValue({
      lat: -33.2,
      lon: -64.4,
    });

    const output = await useCase.execute({
      lotId: 'lot-1',
      tenantId: 'tenant-1',
    });

    expect(output.location.usedFarmFallback).toBe(true);
  });

  it('rejects a lot outside the tenant scope as not found', async () => {
    const { useCase, locationReader } = createHarness();
    locationReader.findByLotAndTenant.mockResolvedValue(null);

    await expect(
      useCase.execute({ lotId: 'lot-9', tenantId: 'tenant-2' }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('rejects an unresolved location instead of inventing one', async () => {
    const { useCase, locationReader } = createHarness();
    locationReader.findByLotAndTenant.mockResolvedValue({
      ...polygonalLot,
      coords: null,
    });
    locationReader.centroidByFarmAndTenant.mockResolvedValue(null);

    await expect(
      useCase.execute({ lotId: 'lot-1', tenantId: 'tenant-1' }),
    ).rejects.toBeInstanceOf(WeatherLocationUnresolvedError);
  });
});
