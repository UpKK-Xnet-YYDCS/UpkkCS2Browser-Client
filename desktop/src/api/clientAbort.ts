export function requestAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

export function isRequestAbortError(error: unknown): boolean {
  return (error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError');
}

export function throwIfRequestAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw requestAbortError();
}

export function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(requestAbortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(requestAbortError());
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function mergeAbortSignals(primary?: AbortSignal, secondary?: AbortSignal): AbortSignal | undefined {
  if (!primary) return secondary;
  if (!secondary) return primary;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([primary, secondary]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (primary.aborted || secondary.aborted) {
    abort();
    return controller.signal;
  }
  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  return controller.signal;
}
