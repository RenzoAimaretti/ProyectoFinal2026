export const CACHE = Symbol('CACHE');

export type CachedEntry<T> = {
  value: T;
  storedAt: Date;
};

/**
 * Entries survive their logical TTL: the store keeps the last value and its
 * timestamp so a use case can decide whether to serve it fresh, refresh it, or
 * degrade to it marked as stale.
 */
export interface CachePort {
  get<T>(key: string): Promise<CachedEntry<T> | null>;
  set<T>(key: string, value: T, storedAt: Date): Promise<void>;
}
