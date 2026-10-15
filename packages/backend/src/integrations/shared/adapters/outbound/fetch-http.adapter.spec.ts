import {
  UpstreamError,
  UpstreamUnavailableError,
} from '../../domain/errors';
import { FetchHttpClient } from './fetch-http.adapter';

const realFetch = global.fetch;

describe('FetchHttpClient', () => {
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('returns the response body as a string on success', async () => {
    global.fetch = jest.fn(
      async () =>
        new Response('{"venta":1535}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    const response = await new FetchHttpClient().request({
      url: 'https://dolarapi.com/v1/dolares/oficial',
      timeoutMs: 1000,
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('{"venta":1535}');
    expect(response.headers['content-type']).toBe('application/json');
  });

  it('maps a status >= 400 to UpstreamError and never leaks the upstream body', async () => {
    global.fetch = jest.fn(
      async () =>
        new Response('<html>upstream exploded</html>', { status: 502 }),
    ) as unknown as typeof fetch;

    const error = await new FetchHttpClient()
      .request({ url: 'https://www.cac.bcr.com.ar/es/precios-de-pizarra', timeoutMs: 1000 })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(502);
    expect((error as Error).message).not.toContain('upstream exploded');
  });

  it('maps a network failure to UpstreamUnavailableError', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    await expect(
      new FetchHttpClient().request({ url: 'https://api.open-meteo.com/v1/forecast', timeoutMs: 1000 }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('aborts the request after the configured timeout and maps it to UpstreamUnavailableError', async () => {
    global.fetch = jest.fn(
      (_url: unknown, init: unknown) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit).signal as AbortSignal;
          signal.addEventListener('abort', () => {
            reject(
              Object.assign(new Error('The operation was aborted'), {
                name: 'AbortError',
              }),
            );
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      new FetchHttpClient().request({ url: 'https://slow.test/never', timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('clears the timeout timer on completion', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    global.fetch = jest.fn(
      async () => new Response('{}', { status: 200 }),
    ) as unknown as typeof fetch;

    await new FetchHttpClient().request({
      url: 'https://api.rainviewer.com/public/weather-maps.json',
      timeoutMs: 1000,
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
