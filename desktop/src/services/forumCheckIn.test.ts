import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkInStatusGradient,
  formatCheckInRequestError,
  parseCheckInPayload,
} from './forumCheckInParse.ts';
import { formatForumWindowError } from './forumWindowFormat.ts';

test('parseCheckInPayload keeps status/message and applies defaults', () => {
  assert.deepEqual(parseCheckInPayload({ status: 1, message: 'ok' }), { status: 1, message: 'ok' });
  assert.deepEqual(parseCheckInPayload({}), { status: 0, message: '签到完成' });
  assert.deepEqual(parseCheckInPayload(undefined), { status: 0, message: '签到完成' });
});

test('formatCheckInRequestError keeps network and generic messages', () => {
  assert.equal(formatCheckInRequestError(new TypeError('Failed to fetch')), '网络请求失败，请检查网络连接');
  assert.equal(formatCheckInRequestError(new Error('请求失败: 500')), '请求失败: 500');
  assert.equal(formatCheckInRequestError(123), '签到请求失败，请稍后重试');
});

test('checkInStatusGradient maps success and other statuses', () => {
  assert.equal(checkInStatusGradient(1), 'from-green-400 to-emerald-500');
  assert.equal(checkInStatusGradient(0), 'from-yellow-400 to-orange-500');
  assert.equal(checkInStatusGradient(2), 'from-yellow-400 to-orange-500');
});

test('formatForumWindowError distinguishes missing Tauri from other failures', () => {
  const labels = { tauriNotDetected: 'no-tauri', openForumFailedMsg: 'open-failed' };
  assert.equal(formatForumWindowError(new Error('Cannot find module'), labels), 'no-tauri');
  assert.equal(formatForumWindowError(new Error('import failed'), labels), 'no-tauri');
  assert.equal(formatForumWindowError(new Error('boom'), labels), 'open-failed: boom');
});

