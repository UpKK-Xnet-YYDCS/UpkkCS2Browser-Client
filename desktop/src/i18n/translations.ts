import type { Language, Translations } from './types';
import { TRANSLATION_KEYS } from './locales/keys.ts';
import { enValues } from './locales/en.ts';
import { jaValues } from './locales/ja.ts';
import { zhCNValues } from './locales/zh-CN.ts';
import { zhTWValues } from './locales/zh-TW.ts';
import { koValues } from './locales/ko.ts';

export type { Language, Translations } from './types';

function zipTranslations(values: readonly string[]): Translations {
  const result: Record<string, string> = {};
  for (let index = 0; index < TRANSLATION_KEYS.length; index += 1) {
    result[TRANSLATION_KEYS[index]] = values[index] ?? '';
  }
  return result as unknown as Translations;
}

export const translations: Record<Language, Translations> = {
  'en': zipTranslations(enValues),
  'ja': zipTranslations(jaValues),
  'zh-CN': zipTranslations(zhCNValues),
  'zh-TW': zipTranslations(zhTWValues),
  'ko': zipTranslations(koValues),
};
