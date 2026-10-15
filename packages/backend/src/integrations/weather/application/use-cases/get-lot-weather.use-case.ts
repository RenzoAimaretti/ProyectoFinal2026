import { EntityNotFoundError } from '../../../shared/domain/errors';
import { WeatherLocationUnresolvedError } from '../../domain/errors';
import { Coordinates, centroidOfCoords } from '../../domain/weather-location';
import { LotLocationReaderPort } from '../weather.ports';
import { GetWeatherByLotInput, WeatherOutput } from '../weather.types';
import { assertRequiredString } from '../weather.validation';
import { GetWeatherUseCase } from './get-weather.use-case';

/**
 * Resuelve la ubicación de trabajo del lote (centroide de su polígono, con
 * fallback al centroide de los lotes del campo) y delega la lectura en
 * `GetWeatherUseCase`. El lote se busca siempre dentro del tenant del caller.
 */
export class GetLotWeatherUseCase {
  constructor(
    private readonly locationReader: LotLocationReaderPort,
    private readonly getWeather: GetWeatherUseCase,
  ) {}

  async execute(input: GetWeatherByLotInput): Promise<WeatherOutput> {
    const lotId = assertRequiredString(input.lotId, 'lotId');
    const tenantId = assertRequiredString(input.tenantId, 'tenantId');

    const lot = await this.locationReader.findByLotAndTenant(lotId, tenantId);

    if (!lot) {
      throw new EntityNotFoundError(`Lot with id ${lotId} not found`);
    }

    const lotCentroid = this.tryCentroid(lot.coords);

    if (lotCentroid) {
      return this.getWeather.execute({
        ...lotCentroid,
        location: { resolvedFrom: 'lot', lotId, usedFarmFallback: false },
      });
    }

    const farmCentroid = await this.locationReader.centroidByFarmAndTenant(
      lot.farmId,
      tenantId,
    );

    if (!farmCentroid) {
      throw new WeatherLocationUnresolvedError(
        `No usable coordinates for lot ${lotId} or its farm`,
      );
    }

    return this.getWeather.execute({
      ...farmCentroid,
      location: { resolvedFrom: 'farm', lotId, usedFarmFallback: true },
    });
  }

  /** Un polígono ilegible no es un error del request: habilita el fallback al campo. */
  private tryCentroid(coords: string | null): Coordinates | null {
    if (!coords || coords.trim().length === 0) {
      return null;
    }

    try {
      return centroidOfCoords(coords);
    } catch (error) {
      if (error instanceof WeatherLocationUnresolvedError) {
        return null;
      }

      throw error;
    }
  }
}
