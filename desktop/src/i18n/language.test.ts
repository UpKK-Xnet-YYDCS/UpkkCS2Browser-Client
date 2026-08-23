import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectSystemLanguage,
  isLanguage,
  readLanguagePreference,
  readNavigatorLanguage,
} from './language.ts';

test('detectSystemLanguage maps the existing browser language prefixes', () => {
  assert.equal(detectSystemLanguage('ja-JP'), 'ja');
  assert.equal(detectSystemLanguage('ko'), 'ko');
  assert.equal(detectSystemLanguage('zh-TW'), 'zh-TW');
  assert.equal(detectSystemLanguage('zh-HK'), 'zh-TW');
  assert.equal(detectSystemLanguage('zh-MO'), 'zh-TW');
  assert.equal(detectSystemLanguage('zh-Hant'), 'zh-TW');
  assert.equal(detectSystemLanguage('zh-CN'), 'zh-CN');
  assert.equal(detectSystemLanguage('zh'), 'zh-CN');
  assert.equal(detectSystemLanguage('en-US'), 'en');
  assert.equal(detectSystemLanguage('fr-FR'), 'en');
});

test('readLanguagePreference keeps invalid stored values as manual + fallback', () => {
  assert.deepEqual(readLanguagePreference(null), { isAuto: true, storedLanguage: null });
  assert.deepEqual(readLanguagePreference('auto'), { isAuto: true, storedLanguage: null });
  assert.deepEqual(readLanguagePreference('zh-CN'), { isAuto: false, storedLanguage: 'zh-CN' });
  assert.deepEqual(readLanguagePreference('fr'), { isAuto: false, storedLanguage: null });
  assert.equal(isLanguage('ko'), true);
  assert.equal(isLanguage('auto'), false);
});

test('readNavigatorLanguage prefers language then languages then English', () => {
  assert.equal(readNavigatorLanguage({ language: 'ja-JP' }), 'ja-JP');
  assert.equal(readNavigatorLanguage({ languages: ['ko-KR'] }), 'ko-KR');
  assert.equal(readNavigatorLanguage({}), 'en');
});
