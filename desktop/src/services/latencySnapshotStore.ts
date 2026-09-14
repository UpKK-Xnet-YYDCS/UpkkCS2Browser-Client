import { isSameLatencySnapshot } from './latencyDisplay.ts';
import type { LocalLatencySnapshot } from './a2sLatencyTypes.ts';

export type LatencySnapshotMap = Readonly<Record<string, LocalLatencySnapshot>>;

export interface LatencySnapshotStore {
  getSnapshots(): LatencySnapshotMap;
  apply(updates: Record<string, LocalLatencySnapshot>, options?: { notify?: boolean }): boolean;
  flushNotify(): void;
  subscribe(listener: () => void): () => void;
}

export function createLatencySnapshotStore(): LatencySnapshotStore {
  let snapshots: Record<string, LocalLatencySnapshot> = {};
  const listeners = new Set<() => void>();
  let pendingNotify = false;

  function notify(): void {
    pendingNotify = false;
    for (const listener of listeners) listener();
  }

  return {
    getSnapshots() {
      return snapshots;
    },
    apply(updates, options) {
      let changed = false;
      let next = snapshots;
      for (const [key, snapshot] of Object.entries(updates)) {
        if (isSameLatencySnapshot(next[key], snapshot)) continue;
        if (next === snapshots) next = { ...snapshots };
        next[key] = snapshot;
        changed = true;
      }
      if (!changed) return false;
      snapshots = next;
      if (options?.notify === false) pendingNotify = true;
      else notify();
      return true;
    },
    flushNotify() {
      if (pendingNotify) notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function listenForProjectionChange<T>(
  subscribe: (listener: () => void) => () => void,
  read: () => T,
  onChange: (value: T) => void,
): () => void {
  let previous = read();
  return subscribe(() => {
    const next = read();
    if (Object.is(previous, next)) return;
    previous = next;
    onChange(next);
  });
}
