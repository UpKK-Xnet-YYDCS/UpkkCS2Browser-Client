import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BROWSER_PREVIEW_LOGIN_ERROR,
  CLOUD_LOGIN_TIMEOUT_MS,
  cloudLoginUrl,
  completeCloudLogin,
  planCloudLoginStart,
  applyCloudAuthRestoreOutcome,
  restoreCloudAuthSession,
  shouldFinishLoginOnWindowClose,
} from './cloudAuthFlow.ts';
import type { AuthStatus } from '../api/auth.ts';

const urls = {
  google: () => 'https://example.test/google',
  discord: () => 'https://example.test/discord',
  upkk: () => 'https://example.test/upkk',
  steam: () => 'https://example.test/steam',
};

test('cloudLoginUrl keeps the existing provider mapping', () => {
  assert.equal(cloudLoginUrl('google', urls), 'https://example.test/google');
  assert.equal(cloudLoginUrl('discord', urls), 'https://example.test/discord');
  assert.equal(cloudLoginUrl('upkk', urls), 'https://example.test/upkk');
  assert.equal(cloudLoginUrl('steam', urls), 'https://example.test/steam');
});

test('planCloudLoginStart keeps the 300s Tauri timeout and preview error copy', () => {
  assert.deepEqual(planCloudLoginStart(false, 'steam', urls), {
    type: 'browser-preview',
    url: 'https://example.test/steam',
    error: BROWSER_PREVIEW_LOGIN_ERROR,
  });
  assert.deepEqual(planCloudLoginStart(true, 'google', urls), {
    type: 'tauri',
    url: 'https://example.test/google',
    timeoutMs: CLOUD_LOGIN_TIMEOUT_MS,
  });
  assert.equal(CLOUD_LOGIN_TIMEOUT_MS, 300_000);
});

test('login window close only finishes an in-flight attempt', () => {
  assert.equal(shouldFinishLoginOnWindowClose(false, false), true);
  assert.equal(shouldFinishLoginOnWindowClose(true, false), false);
  assert.equal(shouldFinishLoginOnWindowClose(false, true), false);
});

test('restoreCloudAuthSession distinguishes missing, valid, invalid, and deferred tokens', async () => {
  const loggedIn: AuthStatus = { logged_in: true, user: { id: 1, username: 'Ada', provider: 'steam' } };
  assert.deepEqual(await restoreCloudAuthSession({ initializeToken: async () => ({}), checkStatus: async () => loggedIn }), { type: 'logged-out' });
  assert.deepEqual(
    await restoreCloudAuthSession({ initializeToken: async () => ({ token: 'abc' }), checkStatus: async () => loggedIn }),
    { type: 'authenticated', status: loggedIn },
  );
  assert.deepEqual(
    await restoreCloudAuthSession({ initializeToken: async () => ({ token: 'abc' }), checkStatus: async () => ({ logged_in: false }) }),
    { type: 'invalid' },
  );
  const deferred = await restoreCloudAuthSession({
    initializeToken: async () => ({ token: 'abc' }),
    checkStatus: async () => { throw new Error('offline'); },
  });
  assert.equal(deferred.type, 'deferred');
  assert.equal((deferred as { reason: Error }).reason.message, 'offline');
});

test('completeCloudLogin keeps persist, optimistic user, verify, then finish/clear/complete order', async () => {
  const calls: string[] = [];
  const statuses: AuthStatus[] = [];
  await completeCloudLogin('tok', { id: 9, display_name: 'Pat' }, {
    persistToken: async (token) => { calls.push('persist:' + token); },
    checkStatus: async () => {
      calls.push('check');
      return { logged_in: true, user: { id: 9, username: 'Pat', provider: 'steam' } };
    },
    invalidate: async () => { calls.push('invalidate'); },
    setAuthenticated: (status) => { calls.push('auth:' + String(status.logged_in)); statuses.push(status); },
    finishLoginAttempt: () => { calls.push('finish'); },
    setError: (error) => { calls.push('error:' + String(error)); },
    clearResponseCache: () => { calls.push('cache'); },
    onDeferredVerification: () => { calls.push('deferred'); },
    onCompleted: () => { calls.push('completed'); },
  });
  assert.deepEqual(calls, ['persist:tok', 'auth:true', 'check', 'auth:true', 'finish', 'error:null', 'cache', 'completed']);
  assert.equal(statuses[0]?.user?.username, 'Pat');
  assert.equal(statuses[0]?.user?.id, 9);
});

test('completeCloudLogin invalidates a failed verification and still finishes the attempt', async () => {
  const calls: string[] = [];
  await completeCloudLogin('tok', { id: 1 }, {
    persistToken: async () => { calls.push('persist'); },
    checkStatus: async () => ({ logged_in: false }),
    invalidate: async () => { calls.push('invalidate'); },
    setAuthenticated: () => { calls.push('auth'); },
    finishLoginAttempt: () => { calls.push('finish'); },
    setError: () => { calls.push('error'); },
    clearResponseCache: () => { calls.push('cache'); },
    onDeferredVerification: () => { calls.push('deferred'); },
    onCompleted: () => { calls.push('completed'); },
  });
  assert.deepEqual(calls, ['persist', 'auth', 'invalidate', 'finish', 'error', 'cache', 'completed']);
});

test('completeCloudLogin treats verification throws as deferred and still completes', async () => {
  const calls: string[] = [];
  await completeCloudLogin('tok', { id: 1 }, {
    persistToken: async () => { calls.push('persist'); },
    checkStatus: async () => { throw new Error('timeout'); },
    invalidate: async () => { calls.push('invalidate'); },
    setAuthenticated: () => { calls.push('auth'); },
    finishLoginAttempt: () => { calls.push('finish'); },
    setError: () => { calls.push('error'); },
    clearResponseCache: () => { calls.push('cache'); },
    onDeferredVerification: () => { calls.push('deferred'); },
    onCompleted: () => { calls.push('completed'); },
  });
  assert.deepEqual(calls, ['persist', 'auth', 'deferred', 'finish', 'error', 'cache', 'completed']);
});

test('applyCloudAuthRestoreOutcome keeps logged-out, authenticated, invalid, then deferred order', async () => {
  const calls: string[] = [];
  const loggedIn: AuthStatus = { logged_in: true, user: { id: 1, username: 'Ada', provider: 'steam' } };
  const deps = {
    setAuthenticated: (status: AuthStatus) => { calls.push('auth:' + String(status.logged_in)); },
    invalidate: async () => { calls.push('invalidate'); },
    onDeferred: (reason: unknown) => { calls.push('deferred:' + String(reason)); },
  };
  await applyCloudAuthRestoreOutcome({ type: 'logged-out' }, deps);
  await applyCloudAuthRestoreOutcome({ type: 'authenticated', status: loggedIn }, deps);
  await applyCloudAuthRestoreOutcome({ type: 'invalid' }, deps);
  await applyCloudAuthRestoreOutcome({ type: 'deferred', reason: 'offline' }, deps);
  assert.deepEqual(calls, ['auth:false', 'auth:true', 'invalidate', 'deferred:offline']);
});

