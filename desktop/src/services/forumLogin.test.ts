import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatForumLoginError,
  isDesktopHttpModuleError,
  parseLoginResponseText,
  sessionFromLoginResponse,
} from './forumLoginParse.ts';
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

test('sessionFromLoginResponse maps a successful payload and defaults isLogin', () => {
  const session = sessionFromLoginResponse(success);
  assert.deepEqual(session, {
    uid: 7,
    username: 'alice',
    steamid64: '765',
    user_auth: 'token',
    isLogin: true,
  });
});

test('sessionFromLoginResponse keeps an explicit isLogin=false', () => {
  const session = sessionFromLoginResponse({
    ...success,
    data: { ...success.data!, isLogin: false },
  });
  assert.equal(session?.isLogin, false);
});

test('sessionFromLoginResponse returns null when login fails', () => {
  assert.equal(sessionFromLoginResponse({ ...success, success: false, data: undefined }), null);
  assert.equal(sessionFromLoginResponse({ ...success, data: undefined }), null);
});

test('parseLoginResponseText reads JSON and rejects malformed payloads', () => {
  assert.equal(parseLoginResponseText(JSON.stringify(success)).code, 0);
  assert.throws(() => parseLoginResponseText('<html>nope</html>'), /响应解析失败/);
});

test('isDesktopHttpModuleError only matches module resolution failures', () => {
  assert.equal(isDesktopHttpModuleError(new Error('Cannot find module')), true);
  assert.equal(isDesktopHttpModuleError(new Error('Failed to resolve @tauri-apps/plugin-http')), true);
  assert.equal(isDesktopHttpModuleError(new Error('HTTP 500: boom')), false);
});

test('formatForumLoginError keeps network, CORS, and generic messages', () => {
  assert.match(formatForumLoginError(new Error('Failed to fetch')), /网络请求失败/);
  assert.match(formatForumLoginError(new Error('CORS blocked')), /跨域请求被阻止/);
  assert.equal(formatForumLoginError(new Error('HTTP 401')), 'HTTP 401');
  assert.match(formatForumLoginError(123), /登录请求失败: 123/);
});

