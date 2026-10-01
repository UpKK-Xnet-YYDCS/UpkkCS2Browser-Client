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

test('getAllFavorites releases its dedupe entry when every attempt hits the request deadline', async (t) => {
  memory.clear();
  invalidateRequestCache();
  setApiBaseUrl('https://one.example');
  clearApiToken();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const flush = () => new Promise<void>(resolve => setImmediate(resolve));

  let listCalls = 0;
  let answer = false;
  setApiHttpFetchForTests((url, init) => {
    if (!String(url).includes('/api/favorites/list')) return Promise.reject(new Error(String(url)));
    listCalls += 1;
    if (answer) {
      return Promise.resolve(new Response(JSON.stringify({
        favorites: [],
        total: 0,
        page: 1,
        per_page: 100,
        total_pages: 1,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    // plugin-http: never answers, rejects with a plain string once cancelled.
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject('Request canceled'), { once: true });
    });
  });

  let failure: unknown;
  const stalled = getAllFavorites().catch(error => {
    failure = error;
  });
  const duplicate = getAllFavorites().catch(() => {});
  await flush();
  assert.equal(listCalls, 1);
  for (let step = 0; step < 400 && failure === undefined; step += 1) {
    t.mock.timers.tick(1_000);
    await flush();
  }
  await stalled;
  await duplicate;
  assert.equal(failure instanceof Error && failure.message.startsWith('网络请求失败'), true);
  assert.equal(listCalls, 3);

  answer = true;
  const recovered = await getAllFavorites();
  assert.deepEqual(recovered.favorites, []);
  assert.equal(listCalls, 4);
  setApiHttpFetchForTests(null);
});
