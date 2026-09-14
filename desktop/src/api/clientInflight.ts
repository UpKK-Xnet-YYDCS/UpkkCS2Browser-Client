import { isRequestAbortError, requestAbortError } from './clientAbort.ts';

export interface InflightGetEntry<T> {
  controller: AbortController;
  consumers: number;
  promise: Promise<T>;
}

export interface SharedGetOptions<T> {
  cacheKey: string;
  inflight: Map<string, InflightGetEntry<unknown>>;
  factory: (signal: AbortSignal) => Promise<T>;
  consumerSignal?: AbortSignal;
  onCancel?: () => void;
}

export function runSharedGet<T>(options: SharedGetOptions<T>): Promise<T> {
  const { cacheKey, inflight, factory, consumerSignal, onCancel } = options;
  if (consumerSignal?.aborted) {
    onCancel?.();
    return Promise.reject(requestAbortError());
  }

  let entry = inflight.get(cacheKey) as InflightGetEntry<T> | undefined;
  if (!entry) {
    const controller = new AbortController();
    const created: InflightGetEntry<T> = {
      controller,
      consumers: 0,
      promise: factory(controller.signal).finally(() => {
        if (inflight.get(cacheKey) === created) inflight.delete(cacheKey);
      }),
    };
    entry = created;
    inflight.set(cacheKey, created);
  }

  entry.consumers += 1;
  const shared = entry;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      consumerSignal?.removeEventListener('abort', onAbort);
      callback();
    };
    const releaseConsumer = () => {
      shared.consumers -= 1;
    };
    const onAbort = () => {
      releaseConsumer();
      onCancel?.();
      if (shared.consumers <= 0) shared.controller.abort();
      finish(() => reject(requestAbortError()));
    };

    if (consumerSignal) {
      consumerSignal.addEventListener('abort', onAbort, { once: true });
    }

    shared.promise.then(
      value => {
        if (settled) return;
        releaseConsumer();
        finish(() => resolve(value));
      },
      error => {
        if (settled) return;
        releaseConsumer();
        finish(() => reject(isRequestAbortError(error) ? requestAbortError() : error));
      },
    );
  });
}

export function abortAllInflight(inflight: Map<string, InflightGetEntry<unknown>>): void {
  for (const entry of inflight.values()) {
    entry.controller.abort();
  }
  inflight.clear();
}
