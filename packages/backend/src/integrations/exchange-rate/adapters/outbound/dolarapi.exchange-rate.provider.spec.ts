import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HttpClientPort,
  HttpRequest,
  HttpResponse,
} from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { DolarApiExchangeRateProvider } from './dolarapi.exchange-rate.provider';

const oficialFixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'dolarapi-oficial.json'), 'utf8'),
) as {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

function createHttpClient(body: string) {
  const request = jest.fn(
    async (_input: HttpRequest): Promise<HttpResponse> => ({
      status: 200,
      headers: {},
      body,
    }),
  );

  return { client: { request } satisfies HttpClientPort, request };
}

describe('DolarApiExchangeRateProvider', () => {
  it('requests the official dollar endpoint', async () => {
    const http = createHttpClient(JSON.stringify(oficialFixture));

    await new DolarApiExchangeRateProvider(http.client).fetchOfficialUsd();

    expect(http.request).toHaveBeenCalledTimes(1);
    expect(http.request.mock.calls[0][0].url).toBe(
      'https://dolarapi.com/v1/dolares/oficial',
    );
  });

  it('maps the captured payload to a USD rate snapshot', async () => {
    const http = createHttpClient(JSON.stringify(oficialFixture));

    const snapshot = await new DolarApiExchangeRateProvider(
      http.client,
    ).fetchOfficialUsd();

    expect(snapshot).toEqual({
      source: 'dolarapi.com',
      casa: 'oficial',
      moneda: 'USD',
      nombre: oficialFixture.nombre,
      compra: oficialFixture.compra,
      venta: oficialFixture.venta,
      fechaActualizacion: oficialFixture.fechaActualizacion,
    });
  });

  it('rejects a payload that is missing the buy and sell prices', async () => {
    const http = createHttpClient(
      JSON.stringify({ moneda: 'USD', casa: 'oficial', nombre: 'Oficial' }),
    );

    await expect(
      new DolarApiExchangeRateProvider(http.client).fetchOfficialUsd(),
    ).rejects.toBeInstanceOf(UpstreamParseError);
  });

  it('rejects a body that is not JSON', async () => {
    const http = createHttpClient('<html>maintenance</html>');

    await expect(
      new DolarApiExchangeRateProvider(http.client).fetchOfficialUsd(),
    ).rejects.toBeInstanceOf(UpstreamParseError);
  });
});
