import type { Language } from './i18n';

export const languageLabels: Record<Language, string> = {
  'en': 'English',
  'ja': '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ko': '한국어',
};

export function getLanguageLabel(lang: Language | 'auto', currentLang: Language): string {
  if (lang === 'auto') {
    return `Auto (${languageLabels[currentLang]})`;
  }
  return languageLabels[lang];
}
