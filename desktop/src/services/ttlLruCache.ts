import { BoundedLruMap } from './boundedLru.ts';

interface TtlEntry<V> {
  value: V;
  createdAt: number;
}

export class TtlLruCache<K, V> {
  readonly #entries: BoundedLruMap<K, TtlEntry<V>>;
  readonly ttlMs: () => number;
  readonly now: () => number;

  constructor(
    maxEntries: number,
    ttlMs: () => number,
    now: () => number = Date.now,
  ) {
    this.#entries = new BoundedLruMap(maxEntries);
    this.ttlMs = ttlMs;
    this.now = now;
  }

  get(key: K): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (this.now() - entry.createdAt >= this.ttlMs()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  set(key: K, value: V): void {
    this.#entries.set(key, { value, createdAt: this.now() });
  }

  delete(key: K): boolean {
    return this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }

  keys(): IterableIterator<K> {
    return this.#entries.keys();
  }
}
