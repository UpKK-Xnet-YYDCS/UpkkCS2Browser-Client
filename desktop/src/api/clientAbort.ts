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

export interface RequestDeadline {
  /** Aborts when a parent aborts (with its reason) or when the deadline expires. */
  readonly signal: AbortSignal;
  /** True only when the deadline, not a parent, aborted the request. */
  readonly expired: boolean;
  /** Clears the timer and detaches from parents; call once the request settles. */
  dispose(): void;
}

export function startRequestDeadline(timeoutMs: number, ...parents: Array<AbortSignal | undefined>): RequestDeadline {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    if (controller.signal.aborted) return;
    expired = true;
    controller.abort(new DOMException('The request deadline expired.', 'TimeoutError'));
  }, timeoutMs);
  const subscriptions: Array<[AbortSignal, () => void]> = [];
  for (const parent of parents) {
    if (!parent) continue;
    const onAbort = () => controller.abort(parent.reason);
    if (parent.aborted) onAbort();
    else {
      parent.addEventListener('abort', onAbort, { once: true });
      subscriptions.push([parent, onAbort]);
    }
  }
  return {
    signal: controller.signal,
    get expired() {
      return expired;
    },
    dispose() {
      clearTimeout(timer);
      for (const [parent, onAbort] of subscriptions) parent.removeEventListener('abort', onAbort);
    },
  };
}
