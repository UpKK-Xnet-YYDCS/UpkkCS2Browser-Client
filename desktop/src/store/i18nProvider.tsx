import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { I18nContext, type I18nContextType } from './i18nContext';
import { translations, type Language } from './i18n';
import {
  LANGUAGE_STORAGE_KEY,
  detectSystemLanguage,
  readLanguagePreference,
  readNavigatorLanguage,
} from '@/i18n/language';

const resolveSystemLanguage = () => detectSystemLanguage(readNavigatorLanguage());

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isAuto, setIsAuto] = useState<boolean>(() => {
    return readLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY)).isAuto;
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    return readLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY)).storedLanguage
      ?? resolveSystemLanguage();
  });

  // Update language when system language changes (for auto mode)
  useEffect(() => {
    if (isAuto) {
      const handleLanguageChange = () => {
        setLanguageState(resolveSystemLanguage());
      };
      
      // Listen for language changes
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, [isAuto]);

  const setLanguage = useCallback((lang: Language | 'auto') => {
    if (lang === 'auto') {
      setIsAuto(true);
      setLanguageState(resolveSystemLanguage());
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'auto');
    } else {
      setIsAuto(false);
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, []);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    isAuto,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

