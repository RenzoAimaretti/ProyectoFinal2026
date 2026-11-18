import { Inject, Injectable } from '@nestjs/common';
import {
  HTTP_CLIENT,
  HttpClientPort,
} from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { UsdRateSnapshot } from '../../domain/exchange-rate.types';
import { ExchangeRateProviderPort } from '../../application/exchange-rate.ports';

/** `casa: "oficial"` es la cotización del Banco Nación que pide R030. */
export const DOLARAPI_OFICIAL_URL = 'https://dolarapi.com/v1/dolares/oficial';

@Injectable()
export class DolarApiExchangeRateProvider
  implements ExchangeRateProviderPort
{
  constructor(@Inject(HTTP_CLIENT) private readonly http: HttpClientPort) {}

  async fetchOfficialUsd(): Promise<UsdRateSnapshot> {
    const response = await this.http.request({ url: DOLARAPI_OFICIAL_URL });

    return mapDolarApiOficial(parseJson(response.body));
  }
}

export function mapDolarApiOficial(payload: unknown): UsdRateSnapshot {
  if (!isRecord(payload)) {
    throw new UpstreamParseError('dolarapi.com payload is not an object');
  }

  const casa = requireString(payload.casa, 'casa');
  const moneda = requireString(payload.moneda, 'moneda');

  if (casa !== 'oficial') {
    throw new UpstreamParseError(
      `dolarapi.com returned an unexpected casa: ${casa}`,
    );
  }

  if (moneda !== 'USD') {
    throw new UpstreamParseError(
      `dolarapi.com returned an unexpected moneda: ${moneda}`,
    );
  }

  return {
    source: 'dolarapi.com',
    casa: 'oficial',
    moneda: 'USD',
    nombre: requireString(payload.nombre, 'nombre'),
    compra: requireNumber(payload.compra, 'compra'),
    venta: requireNumber(payload.venta, 'venta'),
    fechaActualizacion: requireString(
      payload.fechaActualizacion,
      'fechaActualizacion',
    ),
  };
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new UpstreamParseError('dolarapi.com response is not valid JSON');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new UpstreamParseError(
      `dolarapi.com field ${field} is not a non-empty string`,
    );
  }

  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UpstreamParseError(`dolarapi.com field ${field} is not a number`);
  }

  return value;
}
