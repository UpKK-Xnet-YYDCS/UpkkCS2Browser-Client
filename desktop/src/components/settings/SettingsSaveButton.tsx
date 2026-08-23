import type { Translations } from '@/store/i18n';

export function SettingsSaveButton({
  t,
  saved,
  handleSave,
}: {
  t: Translations;
  saved: boolean;
  handleSave: () => void;
}) {
  return (
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  className={`px-6 py-3 text-sm font-medium text-white rounded-xl transition-all shadow-md hover:shadow-lg ${
                    saved 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                  }`}
                >
                  {saved ? t.saved : t.saveSettings}
                </button>
              </div>
  );
}
