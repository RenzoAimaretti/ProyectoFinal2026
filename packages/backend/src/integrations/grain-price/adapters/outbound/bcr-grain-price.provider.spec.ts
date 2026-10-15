import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HttpClientPort,
  HttpRequest,
  HttpResponse,
} from '../../../shared/application/ports/http-client.ports';
import { BcrGrainPriceProvider } from './bcr-grain-price.provider';

const pizarraFixture = readFileSync(
  join(__dirname, '__fixtures__', 'pizarra-bcr.html'),
  'utf8',
);

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

describe('BcrGrainPriceProvider', () => {
  it('requests the BCR pizarra page', async () => {
    const http = createHttpClient(pizarraFixture);

    await new BcrGrainPriceProvider(http.client).fetchPizarra();

    expect(http.request).toHaveBeenCalledTimes(1);
    expect(http.request.mock.calls[0][0].url).toBe(
      'https://www.cac.bcr.com.ar/es/precios-de-pizarra',
    );
  });

  it('delegates the captured HTML to the parser', async () => {
    const http = createHttpClient(pizarraFixture);

    const snapshot = await new BcrGrainPriceProvider(
      http.client,
    ).fetchPizarra();

    expect(snapshot.date).toBe('2026-10-14');
    expect(snapshot.prices).toHaveLength(5);
  });
});
