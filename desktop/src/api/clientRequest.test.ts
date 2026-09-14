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
const { fetchWithRetry } = await import('./clientRequest.ts');
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
