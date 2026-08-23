import assert from 'node:assert/strict';
import test from 'node:test';
import { translations } from './translations.ts';

test('translations include every supported language', () => {
  assert.deepEqual(Object.keys(translations).sort(), ['en', 'ja', 'ko', 'zh-CN', 'zh-TW']);
});
