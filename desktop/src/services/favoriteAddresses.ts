export type FavoriteAddressListener = () => void;

export class FavoriteAddressSubscriptions {
  readonly #listeners = new Map<string, Set<FavoriteAddressListener>>();

  subscribe(address: string, listener: FavoriteAddressListener): () => void {
    const listeners = this.#listeners.get(address) ?? new Set<FavoriteAddressListener>();
    listeners.add(listener);
    this.#listeners.set(address, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.#listeners.delete(address);
    };
  }

  notifyChanges(previous: ReadonlySet<string>, next: ReadonlySet<string>): void {
    for (const [address, listeners] of this.#listeners) {
      if (previous.has(address) === next.has(address)) continue;
      for (const listener of listeners) listener();
    }
  }
}
