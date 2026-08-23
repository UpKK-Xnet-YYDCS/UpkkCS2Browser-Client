import { ApiServerSection } from '@/components/settings/ApiServerSection';
import { AutoRefreshSection } from '@/components/settings/AutoRefreshSection';
import { LanguageSettingsSection } from '@/components/settings/LanguageSettingsSection';
import { LatencySettingsSection } from '@/components/settings/LatencySettingsSection';
import { PrefetchSettingsSection } from '@/components/settings/PrefetchSettingsSection';
import type { Language } from '@/store/i18n';
import type { Translations } from '@/store/i18n';

export interface GeneralApiRefreshSectionProps {
  t: Translations;
  language: Language;
  isAuto: boolean;
  setLanguage: (lang: Language | 'auto') => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (value: number) => void;
  showCustomInput: boolean;
  setShowCustomInput: (value: boolean) => void;
  customInputValue: string;
  setCustomInputValue: (value: string) => void;
  getAutoRefreshOptions: () => Array<{ value: number; label: string }>;
  prefetchPagesCount: number;
  setPrefetchPagesCount: (value: number) => void;
  prefetchDelayMs: number;
  setPrefetchDelayMs: (value: number) => void;
}

export function GeneralApiRefreshSection(props: GeneralApiRefreshSectionProps) {
  return (
    <>
      <LanguageSettingsSection
        t={props.t}
        language={props.language}
        isAuto={props.isAuto}
        setLanguage={props.setLanguage}
      />
      <ApiServerSection
        t={props.t}
        apiUrl={props.apiUrl}
        setApiUrl={props.setApiUrl}
      />
      <AutoRefreshSection
        t={props.t}
        autoRefreshInterval={props.autoRefreshInterval}
        setAutoRefreshInterval={props.setAutoRefreshInterval}
        showCustomInput={props.showCustomInput}
        setShowCustomInput={props.setShowCustomInput}
        customInputValue={props.customInputValue}
        setCustomInputValue={props.setCustomInputValue}
        getAutoRefreshOptions={props.getAutoRefreshOptions}
      />
      <PrefetchSettingsSection
        t={props.t}
        prefetchPagesCount={props.prefetchPagesCount}
        setPrefetchPagesCount={props.setPrefetchPagesCount}
        prefetchDelayMs={props.prefetchDelayMs}
        setPrefetchDelayMs={props.setPrefetchDelayMs}
      />
      <LatencySettingsSection />
    </>
  );
}
