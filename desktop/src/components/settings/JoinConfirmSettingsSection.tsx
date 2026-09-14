import { useI18n } from '@/hooks/useI18n';
import { setSkipJoinConfirm, useSkipJoinConfirm } from '@/services/joinConfirmPreference';

export function JoinConfirmSettingsSection() {
  const { t } = useI18n();
  const skipConfirm = useSkipJoinConfirm();

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t.skipJoinConfirm}
      </h3>
      <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white">{t.skipJoinConfirm}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.skipJoinConfirmDesc}</p>
        </div>
        <button
          type="button"
          onClick={() => setSkipJoinConfirm(!skipConfirm)}
          className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
            skipConfirm ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          aria-pressed={skipConfirm}
          aria-label={t.skipJoinConfirm}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            skipConfirm ? 'translate-x-8' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );
}
