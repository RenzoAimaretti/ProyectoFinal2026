import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WeatherLocationUnresolvedError } from '../../domain/errors';
import { Coordinates, centroidOfCoords } from '../../domain/weather-location';
import {
  LotLocationReaderPort,
  LotLocationRecord,
} from '../../application/weather.ports';

/**
 * Lectura de la ubicación de un lote sobre Prisma. Toda query atraviesa
 * `farm.client.tenantId`, así que un lote de otro tenant es indistinguible de
 * uno inexistente (spec A9).
 */
@Injectable()
export class PrismaLotLocationReader implements LotLocationReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByLotAndTenant(
    lotId: string,
    tenantId: string,
  ): Promise<LotLocationRecord | null> {
    const lot = await this.prisma.lot.findFirst({
      where: { id: lotId, farm: { client: { tenantId } } },
      select: {
        coords: true,
        farmId: true,
        farm: { select: { location: true } },
      },
    });

    if (!lot) {
      return null;
    }

    return {
      coords: lot.coords,
      farmId: lot.farmId,
      farmLocation: lot.farm.location,
    };
  }

  async centroidByFarmAndTenant(
    farmId: string,
    tenantId: string,
  ): Promise<Coordinates | null> {
    const lots = await this.prisma.lot.findMany({
      where: { farmId, farm: { client: { tenantId } } },
      select: { coords: true },
    });

    const centroids = lots
      .map((lot) => this.tryCentroid(lot.coords))
      .filter((centroid): centroid is Coordinates => centroid !== null);

    if (centroids.length === 0) {
      return null;
    }

    const total = centroids.reduce(
      (sum, centroid) => ({
        lat: sum.lat + centroid.lat,
        lon: sum.lon + centroid.lon,
      }),
      { lat: 0, lon: 0 },
    );

    return {
      lat: total.lat / centroids.length,
      lon: total.lon / centroids.length,
    };
  }

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
