import { Injectable } from '@nestjs/common';
import { CachePort, CachedEntry } from '../../application/ports/cache.ports';

/**
 * Las claves de clima incluyen coordenadas, así que el store se acota con un
 * LRU de 200 entradas para que no crezca sin techo.
 */
const MAX_ENTRIES = 200;

@Injectable()
export class InMemoryTtlCache implements CachePort {
  private readonly entries = new Map<string, CachedEntry<unknown>>();

  /**
   * No expira nada: devuelve la entrada con su `storedAt` y deja la decisión de
   * TTL (y la degradación a `stale`) al use case.
   */
  async get<T>(key: string): Promise<CachedEntry<T> | null> {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    // Re-insertar refresca la recencia del LRU acotado.
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry as CachedEntry<T>;
  }

  async set<T>(key: string, value: T, storedAt: Date): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt });
    this.evictOldestWhileOverCapacity();
  }

  private evictOldestWhileOverCapacity(): void {
    while (this.entries.size > MAX_ENTRIES) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      this.entries.delete(oldestKey);
    }
  }
}
