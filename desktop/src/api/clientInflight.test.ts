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

test('requestAbortError uses the AbortError name', () => {
  assert.equal(requestAbortError().name, 'AbortError');
});
