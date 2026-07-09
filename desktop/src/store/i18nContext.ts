import { createContext } from 'react';
import type { Language, Translations } from './i18n';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language | 'auto') => void;
  t: Translations;
  isAuto: boolean;
}

export const I18nContext = createContext<I18nContextType | null>(null);
