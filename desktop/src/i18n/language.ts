import type { Language } from './types';

export const LANGUAGE_STORAGE_KEY = 'upkk-language';

const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'ko'];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function detectSystemLanguage(systemLang: string): Language {
  const langCode = systemLang.toLowerCase();
  if (langCode.startsWith('ja')) return 'ja';
  if (langCode.startsWith('ko')) return 'ko';
  if (langCode === 'zh-tw' || langCode === 'zh-hk' || langCode === 'zh-mo' || langCode === 'zh-hant') {
    return 'zh-TW';
  }
  if (langCode.startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function readNavigatorLanguage(
  nav: { language?: string; languages?: readonly string[] } | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): string {
  return nav?.language || nav?.languages?.[0] || 'en';
}

export function readLanguagePreference(stored: string | null): {
  isAuto: boolean;
  storedLanguage: Language | null;
} {
  return {
    isAuto: stored === null || stored === 'auto',
    storedLanguage: stored && stored !== 'auto' && isLanguage(stored) ? stored : null,
  };
}
