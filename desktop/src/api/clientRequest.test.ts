import assert from 'node:assert/strict';
import test from 'node:test';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, String(value));
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  },
});

const { setApiBaseUrl, setApiToken, clearApiToken } = await import('./client.ts');
const {
  getCached,
  getRequestCacheStats,
  invalidateRequestCache,
  resetRequestCacheStats,
  setCacheIfCurrent,
  snapshotRequest,
} = await import('./clientCache.ts');
const { API_REQUEST_DEADLINE_MS, fetchWithRetry } = await import('./clientRequest.ts');
const { setApiHttpFetchForTests } = await import('./clientTransport.ts');
const { isRequestAbortError } = await import('./clientAbort.ts');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('stale snapshots cannot write into a newer API or auth cache', () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  const snapshot = snapshotRequest('/api/servers');
  setApiBaseUrl('https://two.example');
  assert.equal(setCacheIfCurrent(snapshot, { ok: true }), false);
  assert.equal(getCached('/api/servers'), undefined);
  assert.equal(getRequestCacheStats().invalidWrites >= 1, true);
});

test('switching API URL aborts in-flight reads and leaves the new cache empty', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();

  setApiHttpFetchForTests((_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  }));

  const pending = fetchWithRetry<{ ok: boolean }>('/api/servers');
  setApiBaseUrl('https://two.example');
  await assert.rejects(pending, isRequestAbortError);
  assert.equal(getCached('/api/servers'), undefined);
  setApiHttpFetchForTests(null);
});

test('cancelled fetches are not retried', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();

  let attempts = 0;
  setApiHttpFetchForTests(() => {
    attempts += 1;
    return Promise.reject(new TypeError('fetch failed'));
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchWithRetry('/api/servers', { signal: controller.signal }), isRequestAbortError);
  assert.equal(attempts, 0);
  setApiHttpFetchForTests(null);
});

test('successful reads cache only the snapshot that is still current', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  setApiHttpFetchForTests(() => Promise.resolve(jsonResponse({ total: 4 })));
  assert.deepEqual(await fetchWithRetry('/api/stats'), { total: 4 });
  assert.equal(getRequestCacheStats().hits, 0);
  assert.deepEqual(getCached('/api/stats'), { total: 4 });
  assert.deepEqual(await fetchWithRetry('/api/stats'), { total: 4 });
  assert.equal(getRequestCacheStats().hits >= 2, true);
  setApiHttpFetchForTests(null);
});

test('switching account token aborts in-flight reads and rejects stale cache writes', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  setApiToken('user-a');
  const stale = snapshotRequest('/api/favorites/list');
  assert.equal(setCacheIfCurrent(stale, { owner: 'a' }), true);
  assert.deepEqual(getCached('/api/favorites/list'), { owner: 'a' });

  setApiHttpFetchForTests((_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  }));
  const pending = fetchWithRetry<{ owner: string }>('/api/favorites/me');
  setApiToken('user-b');
  await assert.rejects(pending, isRequestAbortError);
  assert.equal(getCached('/api/favorites/list'), undefined);
  assert.equal(setCacheIfCurrent(stale, { owner: 'stale' }), false);
  setApiHttpFetchForTests(null);
});

test('retryable 500 responses retry then succeed', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  let attempts = 0;
  setApiHttpFetchForTests(() => {
    attempts += 1;
    if (attempts === 1) {
      return Promise.resolve(jsonResponse({ error: 'unavailable' }, 500));
    }
    return Promise.resolve(jsonResponse({ total: 2 }));
  });
  assert.deepEqual(await fetchWithRetry('/api/stats', undefined, 2), { total: 2 });
  assert.equal(attempts, 2);
  setApiHttpFetchForTests(null);
});

test('a read issued right after its only consumer cancelled gets a fresh request, not a retry', async () => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();

  let attempts = 0;
  setApiHttpFetchForTests((_url, init) => {
    attempts += 1;
    if (attempts === 1) {
      // plugin-http rejects a cancelled request with a plain string.
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject('Request canceled'), { once: true });
      });
    }
    return Promise.resolve(jsonResponse({ page: 2 }));
  });

  const prefetch = new AbortController();
  const prefetched = fetchWithRetry('/api/servers?page=2', { signal: prefetch.signal });
  prefetch.abort();
  const startedAt = Date.now();
  const current = fetchWithRetry<{ page: number }>('/api/servers?page=2');

  await assert.rejects(prefetched, isRequestAbortError);
  assert.deepEqual(await current, { page: 2 });
  assert.equal(attempts, 2);
  assert.equal(Date.now() - startedAt < 900, true, 'must not wait for the 1 s retry backoff');
  assert.equal(getRequestCacheStats().inflight, 0);
  setApiHttpFetchForTests(null);
});

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function hangingTransport(signals: AbortSignal[]) {
  return (_url: string, init?: RequestInit) => {
    if (init?.signal) signals.push(init.signal);
    // plugin-http: never answers, rejects with a plain string once cancelled.
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject('Request canceled'), { once: true });
    });
  };
}

function isDeadlineNetworkError(error: unknown): boolean {
  return error instanceof Error
    && !isRequestAbortError(error)
    && error.message.startsWith('网络请求失败: https://one.example/api/stats - 无法连接到服务器。')
    && error.cause === 'Request canceled';
}

test('a request that never settles fails at the deadline and releases the shared entry', async (t) => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  setApiHttpFetchForTests(hangingTransport(signals));

  const first = fetchWithRetry('/api/stats', undefined, 1);
  const joined = fetchWithRetry('/api/stats', undefined, 1);
  await flush();
  assert.equal(signals.length, 1);
  assert.equal(getRequestCacheStats().inflight, 1);

  t.mock.timers.tick(API_REQUEST_DEADLINE_MS - 1);
  await flush();
  assert.equal(signals[0].aborted, false);
  t.mock.timers.tick(1);
  await assert.rejects(first, isDeadlineNetworkError);
  await assert.rejects(joined, isDeadlineNetworkError);
  assert.equal(signals[0].aborted, true);
  assert.equal(getRequestCacheStats().inflight, 0);
  setApiHttpFetchForTests(null);
});

test('a timed-out attempt goes through the existing retry path', async (t) => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  const hanging = hangingTransport(signals);
  let attempts = 0;
  setApiHttpFetchForTests((url, init) => {
    attempts += 1;
    return attempts === 1 ? hanging(url, init) : Promise.resolve(jsonResponse({ total: 9 }));
  });

  let result: unknown;
  const pending = fetchWithRetry('/api/stats', undefined, 2).then(value => {
    result = value;
  });
  for (let step = 0; step < 70 && result === undefined; step += 1) {
    t.mock.timers.tick(1_000);
    await flush();
  }
  await pending;
  assert.deepEqual(result, { total: 9 });
  assert.equal(attempts, 2);
  assert.equal(getRequestCacheStats().inflight, 0);
  setApiHttpFetchForTests(null);
});

test('completed requests clear their deadline and detach from the caller signal', async (t) => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  setApiHttpFetchForTests((_url, init) => {
    if (init?.signal) signals.push(init.signal);
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  const caller = new AbortController();
  assert.deepEqual(await fetchWithRetry('/api/favorites/add', { method: 'POST', signal: caller.signal }, 1), { ok: true });
  assert.deepEqual(await fetchWithRetry('/api/stats', undefined, 1), { ok: true });
  t.mock.timers.tick(API_REQUEST_DEADLINE_MS * 2);
  caller.abort();
  assert.equal(signals.length, 2);
  assert.equal(signals.every(signal => !signal.aborted), true);
  setApiHttpFetchForTests(null);
});

test('caller aborts before the deadline still reject as aborts and are not retried', async (t) => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  setApiHttpFetchForTests((_url, init) => {
    if (init?.signal) signals.push(init.signal);
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
  });

  const caller = new AbortController();
  const pending = fetchWithRetry('/api/stats', { signal: caller.signal });
  t.mock.timers.tick(API_REQUEST_DEADLINE_MS - 1);
  caller.abort();
  await assert.rejects(pending, isRequestAbortError);
  t.mock.timers.tick(API_REQUEST_DEADLINE_MS);
  await flush();
  assert.equal(signals.length, 1);
  assert.equal(getRequestCacheStats().inflight, 0);
  setApiHttpFetchForTests(null);
});

test('browser transports see the deadline as a TimeoutError reason, not an abort', async (t) => {
  memory.clear();
  invalidateRequestCache();
  resetRequestCacheStats();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  setApiHttpFetchForTests((_url, init) => new Promise<Response>((_resolve, reject) => {
    // Browser fetch rejects with the signal's reason.
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
  }));

  const pending = fetchWithRetry('/api/stats', undefined, 1);
  t.mock.timers.tick(API_REQUEST_DEADLINE_MS);
  await assert.rejects(pending, (error: unknown) => error instanceof Error
    && !isRequestAbortError(error)
    && error.message.startsWith('网络请求失败: https://one.example/api/stats')
    && (error.cause as DOMException).name === 'TimeoutError');
  assert.equal(getRequestCacheStats().inflight, 0);
  setApiHttpFetchForTests(null);
});
