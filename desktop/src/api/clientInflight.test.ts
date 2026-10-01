import assert from 'node:assert/strict';
import test from 'node:test';
import { delayWithSignal, isRequestAbortError, requestAbortError } from './clientAbort.ts';
import { runSharedGet, type InflightGetEntry } from './clientInflight.ts';

test('delayWithSignal rejects when aborted during the wait and does not retry the timer', async () => {
  const controller = new AbortController();
  const pending = delayWithSignal(50, controller.signal);
  controller.abort();
  await assert.rejects(pending, isRequestAbortError);
});

test('delayWithSignal rejects immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(delayWithSignal(50, controller.signal), isRequestAbortError);
});

test('shared GET keeps the request alive when one consumer cancels', async () => {
  const inflight = new Map<string, InflightGetEntry<unknown>>();
  let started = 0;
  let aborted = false;
  let resolveFactory: ((value: string) => void) | undefined;
  const factory = (signal: AbortSignal) => {
    started += 1;
    signal.addEventListener('abort', () => {
      aborted = true;
    }, { once: true });
    return new Promise<string>(resolve => {
      resolveFactory = resolve;
    });
  };

  const first = new AbortController();
  const second = new AbortController();
  const firstResult = runSharedGet({
    cacheKey: '/api/servers',
    inflight,
    factory,
    consumerSignal: first.signal,
  });
  const secondResult = runSharedGet({
    cacheKey: '/api/servers',
    inflight,
    factory,
    consumerSignal: second.signal,
  });

  first.abort();
  await assert.rejects(firstResult, isRequestAbortError);
  assert.equal(aborted, false);
  assert.equal(started, 1);
  resolveFactory?.('ok');
  assert.equal(await secondResult, 'ok');
});

test('shared GET aborts the transport only after every consumer cancels', async () => {
  const inflight = new Map<string, InflightGetEntry<unknown>>();
  let aborted = false;
  const factory = (signal: AbortSignal) => {
    signal.addEventListener('abort', () => {
      aborted = true;
    }, { once: true });
    return new Promise<string>(() => {});
  };
  const first = new AbortController();
  const second = new AbortController();
  const firstResult = runSharedGet({
    cacheKey: '/api/servers',
    inflight,
    factory,
    consumerSignal: first.signal,
  });
  const secondResult = runSharedGet({
    cacheKey: '/api/servers',
    inflight,
    factory,
    consumerSignal: second.signal,
  });
  first.abort();
  await assert.rejects(firstResult, isRequestAbortError);
  assert.equal(aborted, false);
  second.abort();
  await assert.rejects(secondResult, isRequestAbortError);
  assert.equal(aborted, true);
});

test('shared GET starts a fresh request instead of joining one whose consumers all cancelled', async () => {
  const inflight = new Map<string, InflightGetEntry<unknown>>();
  const signals: AbortSignal[] = [];
  const resolvers: Array<(value: string) => void> = [];
  const factory = (signal: AbortSignal) => {
    signals.push(signal);
    return new Promise<string>((resolve, reject) => {
      resolvers.push(resolve);
      // plugin-http rejects a cancelled request with a plain string.
      signal.addEventListener('abort', () => reject('Request canceled'), { once: true });
    });
  };

  const prefetch = new AbortController();
  const prefetchResult = runSharedGet({
    cacheKey: '/api/servers?page=2',
    inflight,
    factory,
    consumerSignal: prefetch.signal,
  });
  prefetch.abort();
  // Same tick: the dead entry has not settled or left the map yet.
  const userResult = runSharedGet({ cacheKey: '/api/servers?page=2', inflight, factory });

  await assert.rejects(prefetchResult, isRequestAbortError);
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  // The cancelled entry's cleanup must not evict its replacement.
  assert.equal(inflight.size, 1);
  resolvers[1]('page-2');
  assert.equal(await userResult, 'page-2');
  assert.equal(inflight.size, 0);
});

test('requestAbortError uses the AbortError name', () => {
  assert.equal(requestAbortError().name, 'AbortError');
});
