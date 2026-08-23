import { TrashIcon } from '@/components/settings/SettingsIcons';
import type { Translations } from '@/store/i18n';

export function ClearDataSection({
  t,
  onClearData,
}: {
  t: Translations;
  onClearData: () => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrashIcon />
                  {t.dataManagement}
                </h3>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-red-800 dark:text-red-300">{t.clearData}</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {t.clearDataDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => onClearData()}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <TrashIcon />
                      {t.clearDataBtn}
                    </button>
                  </div>
                </div>
              </div>
  );
}
