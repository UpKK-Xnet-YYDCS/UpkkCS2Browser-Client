import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FORUM_LOGIN_FAILURE_MESSAGE,
  authenticateForumUser,
  forumLoginFailureMessage,
  persistRememberedForumCredentials,
  prepareForumAutoLogin,
} from './forumAuthFlow.ts';
import type { LoginResponse } from '../types/user.ts';

const success: LoginResponse = {
  success: true,
  code: 0,
  message: 'ok',
  remaining_attempts: 3,
  data: {
    uid: 7,
    username: 'alice',
    steamid64: '765',
    steamaccountid: 1,
    user_auth: 'token',
  },
};

test('authenticateForumUser maps a successful payload and keeps rejected copy', async () => {
  const ok = await authenticateForumUser('765', 'code', async () => success);
  assert.equal(ok.type, 'authenticated');
  if (ok.type === 'authenticated') {
    assert.equal(ok.session.username, 'alice');
    assert.equal(ok.session.isLogin, true);
    assert.equal(ok.data.success, true);
  }

  const rejected = await authenticateForumUser('765', 'code', async () => ({
    ...success,
    success: false,
    data: undefined,
    message: 'bad code',
  }));
  assert.deepEqual(rejected, { type: 'rejected', data: { ...success, success: false, data: undefined, message: 'bad code' }, message: 'bad code' });

  const fallback = await authenticateForumUser('765', 'code', async () => ({ ...success, success: false, data: undefined, message: '' }));
  assert.equal(fallback.type, 'rejected');
  if (fallback.type === 'rejected') assert.equal(fallback.message, FORUM_LOGIN_FAILURE_MESSAGE);
});

test('authenticateForumUser keeps request failures separate from rejected payloads', async () => {
  const failed = await authenticateForumUser('765', 'code', async () => { throw new Error('Failed to fetch'); });
  assert.equal(failed.type, 'failed');
  if (failed.type === 'failed') assert.equal((failed.error as Error).message, 'Failed to fetch');
});

test('persistRememberedForumCredentials distinguishes saved, failed, and thrown results', async () => {
  assert.deepEqual(await persistRememberedForumCredentials('1', '2', async () => ({ success: true, message: 'ok' })), { type: 'saved' });
  assert.deepEqual(await persistRememberedForumCredentials('1', '2', async () => ({ success: false, message: 'disk' })), { type: 'failed', message: 'disk' });
  const threw = await persistRememberedForumCredentials('1', '2', async () => { throw new Error('boom'); });
  assert.equal(threw.type, 'threw');
});

test('prepareForumAutoLogin requires stored steamid64 and securecode', async () => {
  assert.deepEqual(await prepareForumAutoLogin({ hasStoredCredentials: async () => false, loadCredentials: async () => ({ success: false }) }), { type: 'no-credentials' });
  assert.deepEqual(
    await prepareForumAutoLogin({
      hasStoredCredentials: async () => true,
      loadCredentials: async () => ({ success: false, message: 'missing' }),
    }),
    { type: 'load-failed', message: 'missing' },
  );
  assert.deepEqual(
    await prepareForumAutoLogin({
      hasStoredCredentials: async () => true,
      loadCredentials: async () => ({ success: true, steamid64: '765', securecode: 'abc' }),
    }),
    { type: 'ready', steamid64: '765', securecode: 'abc' },
  );
});

test('forumLoginFailureMessage keeps the existing fallback copy', () => {
  assert.equal(forumLoginFailureMessage('taken'), 'taken');
  assert.equal(forumLoginFailureMessage(''), FORUM_LOGIN_FAILURE_MESSAGE);
  assert.equal(forumLoginFailureMessage(), FORUM_LOGIN_FAILURE_MESSAGE);
});
