export const HTTP_CLIENT = Symbol('HTTP_CLIENT');

export type HttpRequest = {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export interface HttpClientPort {
  /** Red/timeout -> UpstreamUnavailableError. status >= 400 -> UpstreamError. */
  request(input: HttpRequest): Promise<HttpResponse>;
}
