import { Module } from '@nestjs/common';
import { CACHE } from './application/ports/cache.ports';
import { CLOCK } from './application/ports/clock.ports';
import { HTTP_CLIENT } from './application/ports/http-client.ports';
import { FetchHttpClient } from './adapters/outbound/fetch-http.adapter';
import { InMemoryTtlCache } from './adapters/outbound/in-memory-ttl-cache';
import { SystemClock } from './adapters/outbound/system-clock';

/**
 * Módulo compartido normal que exporta tokens, no un `@Global()`: el wiring
 * queda visible en cada hexágono que lo importa.
 */
@Module({
  providers: [
    FetchHttpClient,
    InMemoryTtlCache,
    SystemClock,
    { provide: HTTP_CLIENT, useExisting: FetchHttpClient },
    { provide: CACHE, useExisting: InMemoryTtlCache },
    { provide: CLOCK, useExisting: SystemClock },
  ],
  exports: [HTTP_CLIENT, CACHE, CLOCK],
})
export class IntegrationsSharedModule {}
