import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MONITOR_REQUEST_TIMEOUT_MS,
  postJsonWithTimeout,
  type MonitorJsonFetch,
} from './postMonitorJson.ts';

/** Like plugin-http: never answers on its own, rejects with a plain string once cancelled. */
function neverAnsweringTransport(seen: RequestInit[]): MonitorJsonFetch {
  return (_url, init) => {
    seen.push(init);
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject('Request canceled'), { once: true });
    });
  };
}

test('monitor POSTs are bounded by a 15 second deadline', () => {
  assert.equal(MONITOR_REQUEST_TIMEOUT_MS, 15_000);
});

test('postJsonWithTimeout aborts a webhook that never answers once the deadline passes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: RequestInit[] = [];
  let settled = false;
  const pending = postJsonWithTimeout(neverAnsweringTransport(seen), 'https://hook.example/x', { a: 1 })
    .finally(() => {
      settled = true;
    });

  t.mock.timers.tick(MONITOR_REQUEST_TIMEOUT_MS - 1);
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(seen[0].signal?.aborted, false);

  t.mock.timers.tick(1);
  await assert.rejects(pending, (error: unknown) => error === 'Request canceled');
  assert.equal(seen[0].signal?.aborted, true);
  assert.equal((seen[0].signal?.reason as DOMException).name, 'TimeoutError');
});

test('postJsonWithTimeout keeps the POST shape and clears its deadline once answered', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const response = await postJsonWithTimeout(
    (url, init) => {
      calls.push({ url, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    },
    'https://hook.example/x',
    { event: 'map_alert', players: 3 },
  );

  assert.equal(response.status, 204);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hook.example/x');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(calls[0].init.headers, { 'Content-Type': 'application/json' });
  assert.equal(calls[0].init.body, JSON.stringify({ event: 'map_alert', players: 3 }));
  t.mock.timers.tick(MONITOR_REQUEST_TIMEOUT_MS * 2);
  assert.equal(calls[0].init.signal?.aborted, false);
});

test('postJsonWithTimeout clears its deadline when the transport fails', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: RequestInit[] = [];
  await assert.rejects(
    postJsonWithTimeout((_url, init) => {
      seen.push(init);
      return Promise.reject(new TypeError('Failed to fetch'));
    }, 'https://hook.example/x', {}),
    TypeError,
  );
  t.mock.timers.tick(MONITOR_REQUEST_TIMEOUT_MS * 2);
  assert.equal(seen[0].signal?.aborted, false);
});

test('postJsonWithTimeout releases the unread webhook response body', async () => {
  let cancels = 0;
  const body = new ReadableStream<Uint8Array>({
    pull() {},
    cancel() {
      cancels += 1;
    },
  });
  const response = await postJsonWithTimeout(
    () => Promise.resolve(new Response(body, { status: 200 })),
    'https://hook.example/x',
    {},
  );
  assert.equal(response.ok, true);
  assert.equal(response.status, 200);
  assert.equal(cancels, 1);
});
