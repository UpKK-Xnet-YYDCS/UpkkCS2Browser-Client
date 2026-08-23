import assert from 'node:assert/strict';
import test from 'node:test';
import { STEAM_SECURE_CODE_URL, canSubmitSteamLogin } from './loginSubmit.ts';

test('canSubmitSteamLogin requires both trimmed fields', () => {
  assert.equal(canSubmitSteamLogin('', 'code'), false);
  assert.equal(canSubmitSteamLogin('7656', ''), false);
  assert.equal(canSubmitSteamLogin('  ', '  code  '), false);
  assert.equal(canSubmitSteamLogin('7656', '  '), false);
  assert.equal(canSubmitSteamLogin(' 7656 ', ' abc '), true);
});

test('secure code URL stays on the existing SoftLogin endpoint', () => {
  assert.equal(STEAM_SECURE_CODE_URL, 'https://bbs.upkk.com/plugin.php?id=xnet_steam_openid:SoftLogin_getsecurecode');
});
