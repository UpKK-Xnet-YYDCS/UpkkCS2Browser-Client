import { useEffect, useRef, useState } from 'react';
import {
  listenForProjectionChange,
  type LatencySnapshotStore,
} from '@/services/latencySnapshotStore';

export function useLatencyProjection<T>(store: LatencySnapshotStore, compute: () => T): T {
  const [value, setValue] = useState(compute);
  const computeRef = useRef(compute);

  useEffect(() => {
    computeRef.current = compute;
    return listenForProjectionChange(
      listener => store.subscribe(listener),
      () => computeRef.current(),
      next => {
        setValue(previous => (Object.is(previous, next) ? previous : next));
      },
    );
  }, [compute, store]);

  const computed = compute();
  return Object.is(computed, value) ? value : computed;
}
