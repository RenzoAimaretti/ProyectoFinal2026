import { InMemoryTtlCache } from './in-memory-ttl-cache';

describe('InMemoryTtlCache', () => {
  it('stores and reads an entry together with its storedAt timestamp', async () => {
    const cache = new InMemoryTtlCache();
    const storedAt = new Date('2026-10-15T15:00:00.000Z');

    await cache.set('weather:-33.13,-64.35', { temperatureC: 18.4 }, storedAt);

    await expect(cache.get('weather:-33.13,-64.35')).resolves.toEqual({
      value: { temperatureC: 18.4 },
      storedAt,
    });
  });

  it('returns null for an unknown key', async () => {
    const cache = new InMemoryTtlCache();

    await expect(cache.get('missing')).resolves.toBeNull();
  });

  it('keeps entries well past any logical TTL so callers can serve a stale value', async () => {
    const cache = new InMemoryTtlCache();
    const storedAt = new Date('2020-01-01T00:00:00.000Z');

    await cache.set('exchange-rate:usd-oficial', { venta: 1535 }, storedAt);

    const entry = await cache.get<{ venta: number }>('exchange-rate:usd-oficial');

    expect(entry).not.toBeNull();
    expect(entry?.value.venta).toBe(1535);
    expect(entry?.storedAt).toEqual(storedAt);
  });

  it('bounds the store to 200 entries and evicts the least recently used one', async () => {
    const cache = new InMemoryTtlCache();
    const now = new Date('2026-10-15T00:00:00.000Z');

    for (let index = 0; index < 200; index += 1) {
      await cache.set(`key-${index}`, index, now);
    }

    // Reading refreshes recency, so key-0 survives the next insertion.
    await cache.get('key-0');
    await cache.set('key-200', 200, now);

    await expect(cache.get('key-0')).resolves.not.toBeNull();
    await expect(cache.get('key-1')).resolves.toBeNull();
    await expect(cache.get('key-200')).resolves.not.toBeNull();
  });
});
