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

const { setApiBaseUrl, clearApiToken } = await import('./client.ts');
const { invalidateRequestCache } = await import('./clientCache.ts');
const { getAllFavorites } = await import('./favorites.ts');
const { setApiHttpFetchForTests } = await import('./clientTransport.ts');

test('duplicate getAllFavorites calls share one in-flight page read', async () => {
  memory.clear();
  invalidateRequestCache();
  setApiBaseUrl('https://one.example');
  clearApiToken();

  let listCalls = 0;
  setApiHttpFetchForTests(url => {
    if (String(url).includes('/api/favorites/list')) {
      listCalls += 1;
      return Promise.resolve(new Response(JSON.stringify({
        favorites: [{ id: 1, server_ip: '1.1.1.1', server_port: '27015', server_name: 'A', added_at: '' }],
        total: 1,
        page: 1,
        per_page: 100,
        total_pages: 1,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.reject(new Error(String(url)));
  });

  const [first, second] = await Promise.all([getAllFavorites(), getAllFavorites()]);
  assert.equal(first, second);
  assert.equal(listCalls, 1);
  setApiHttpFetchForTests(null);
});
