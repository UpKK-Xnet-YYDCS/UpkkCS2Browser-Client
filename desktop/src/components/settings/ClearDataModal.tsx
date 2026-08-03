import type { Translations } from '@/store/i18n';
import { TrashIcon, XMarkIcon } from './SettingsIcons';

interface ClearDataModalProps {
  open: boolean;
  isClearing: boolean;
  t: Translations;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearDataModal({
  open,
  isClearing,
  t,
  onCancel,
  onConfirm,
}: ClearDataModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-red-500 to-orange-500">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            <TrashIcon />
          </div>
          <h2 className="text-lg font-bold text-white">{t.confirmClearData}</h2>
        </div>
        <div className="p-5">
          <p className="text-gray-700 dark:text-gray-300 mb-4">{t.clearDataWarning}</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6">
            {[t.clearLoginStatus, t.clearThemeSettings, t.clearFavorites, t.clearCacheData].map(label => (
              <li key={label} className="flex items-center gap-2">
                <XMarkIcon className="w-4 h-4 text-red-500" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
            {t.clearDataIrreversible}
          </p>
        </div>
        <div className="flex justify-end gap-3 p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onCancel}
            disabled={isClearing}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isClearing}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isClearing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t.clearing}
              </>
            ) : (
              <>
                <TrashIcon />
                {t.confirmClearRestart}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

