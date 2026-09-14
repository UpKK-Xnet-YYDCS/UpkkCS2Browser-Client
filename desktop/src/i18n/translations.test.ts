import assert from 'node:assert/strict';
import test from 'node:test';
import { TRANSLATION_KEYS } from './locales/keys.ts';
import { enValues } from './locales/en.ts';
import { jaValues } from './locales/ja.ts';
import { zhCNValues } from './locales/zh-CN.ts';
import { zhTWValues } from './locales/zh-TW.ts';
import { koValues } from './locales/ko.ts';
import { translations } from './translations.ts';

test('translations include every supported language', () => {
  assert.deepEqual(Object.keys(translations).sort(), ['en', 'ja', 'ko', 'zh-CN', 'zh-TW']);
});

test('all five language packs share the same key set and load synchronously', () => {
  const languages = Object.keys(translations).sort() as Array<keyof typeof translations>;
  const keySets = languages.map(language => Object.keys(translations[language]).sort());
  for (let index = 1; index < keySets.length; index += 1) {
    assert.deepEqual(keySets[index], keySets[0]);
  }
  assert.equal(keySets[0].length, Object.keys(translations.en).length);
  assert.equal(translations.en.appName, 'Upkk Server Browser');
  assert.equal(TRANSLATION_KEYS.length, enValues.length);
  assert.equal(jaValues.length, enValues.length);
  assert.equal(zhCNValues.length, enValues.length);
  assert.equal(zhTWValues.length, enValues.length);
  assert.equal(koValues.length, enValues.length);
  assert.deepEqual([...TRANSLATION_KEYS].sort(), keySets[0]);
});
