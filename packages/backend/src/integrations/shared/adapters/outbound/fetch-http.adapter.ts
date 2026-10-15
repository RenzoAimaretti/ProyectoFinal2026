import { Injectable } from '@nestjs/common';
import {
  HttpClientPort,
  HttpRequest,
  HttpResponse,
} from '../../application/ports/http-client.ports';
import { UpstreamError, UpstreamUnavailableError } from '../../domain/errors';
import { readExternalHttpTimeoutMs } from '../../integrations.config';

/**
 * Outbound HTTP adapter over the global `fetch` (Node 24), with an
 * `AbortController` timeout so a hung upstream cancels the request for real.
 */
@Injectable()
export class FetchHttpClient implements HttpClientPort {
  async request(input: HttpRequest): Promise<HttpResponse> {
    const timeoutMs = input.timeoutMs ?? readExternalHttpTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input.url, {
        method: input.method ?? 'GET',
        headers: input.headers,
        body: input.body,
        signal: controller.signal,
      });
      const body = await response.text();

      if (response.status >= 400) {
        throw new UpstreamError(response.status, input.url);
      }

      return {
        status: response.status,
        headers: toHeaderRecord(response.headers),
        body,
      };
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw error;
      }

      throw new UpstreamUnavailableError(
        `Request to ${input.url} failed: ${describeError(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function toHeaderRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });

  return record;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
