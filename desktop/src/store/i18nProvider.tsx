import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { I18nContext, type I18nContextType } from './i18nContext';
import { translations, type Language } from './i18n';

// Detect system language and map to supported language
const detectSystemLanguage = (): Language => {
  const systemLang = navigator.language || navigator.languages?.[0] || 'en';
  const langCode = systemLang.toLowerCase();
  
  if (langCode.startsWith('ja')) {
    return 'ja';
  }
  if (langCode.startsWith('ko')) {
    return 'ko';
  }
  // Traditional Chinese (Taiwan, Hong Kong, Macau)
  if (langCode === 'zh-tw' || langCode === 'zh-hk' || langCode === 'zh-mo' || langCode === 'zh-hant') {
    return 'zh-TW';
  }
  // Simplified Chinese (default for zh)
  if (langCode.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

const LANGUAGE_STORAGE_KEY = 'upkk-language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isAuto, setIsAuto] = useState<boolean>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === null || stored === 'auto';
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored !== 'auto' && (stored === 'en' || stored === 'ja' || stored === 'zh-CN' || stored === 'zh-TW' || stored === 'ko')) {
      return stored;
    }
    return detectSystemLanguage();
  });

  // Update language when system language changes (for auto mode)
  useEffect(() => {
    if (isAuto) {
      const handleLanguageChange = () => {
        setLanguageState(detectSystemLanguage());
      };
      
      // Listen for language changes
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, [isAuto]);

  const setLanguage = useCallback((lang: Language | 'auto') => {
    if (lang === 'auto') {
      setIsAuto(true);
      setLanguageState(detectSystemLanguage());
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

