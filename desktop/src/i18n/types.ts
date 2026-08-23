import type { MonitorTranslations } from './translationDomains/monitor';
import type { PageTranslations } from './translationDomains/pages';
import type { ServerTranslations } from './translationDomains/servers';
import type { ShellTranslations } from './translationDomains/shell';

export type { MonitorTranslations } from './translationDomains/monitor';
export type { PageTranslations } from './translationDomains/pages';
export type { ServerTranslations } from './translationDomains/servers';
export type { ShellTranslations } from './translationDomains/shell';

export type Language = 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'ko';

export type Translations =
  & ShellTranslations
  & PageTranslations
  & ServerTranslations
  & MonitorTranslations;
