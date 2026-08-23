import { GlobeIcon } from '@/components/settings/SettingsIcons';
import type { Language } from '@/store/i18n';
import { languageLabels } from '@/store/i18nLabels';
import type { Translations } from '@/store/i18n';

export function LanguageSettingsSection({
  t,
  language,
  isAuto,
  setLanguage,
}: {
  t: Translations;
  language: Language;
  isAuto: boolean;
  setLanguage: (lang: Language | 'auto') => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <GlobeIcon />
                  {t.languageSettings}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.languageLabel}
                    </label>
                    <select
                      value={isAuto ? 'auto' : language}
                      onChange={(e) => setLanguage(e.target.value as Language | 'auto')}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="auto">{t.languageAuto}</option>
                      <option value="en">{languageLabels['en']}</option>
                      <option value="ja">{languageLabels['ja']}</option>
                      <option value="zh-CN">{languageLabels['zh-CN']}</option>
                      <option value="zh-TW">{languageLabels['zh-TW']}</option>
                      <option value="ko">{languageLabels['ko']}</option>
                    </select>
                  </div>
                </div>
              </div>
  );
}
