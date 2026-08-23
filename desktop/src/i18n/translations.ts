import type { Language, Translations } from './types';
import { en } from './locales/en.ts';
import { ja } from './locales/ja.ts';
import { zhCN } from './locales/zh-CN.ts';
import { zhTW } from './locales/zh-TW.ts';
import { ko } from './locales/ko.ts';

export type { Language, Translations } from './types';

export const translations: Record<Language, Translations> = {
  'en': en,
  'ja': ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ko': ko,
};
