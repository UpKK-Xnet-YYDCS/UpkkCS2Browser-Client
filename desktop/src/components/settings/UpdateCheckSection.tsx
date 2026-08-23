import { UpdateIcon } from '@/components/settings/SettingsIcons';
import { XPROJ_USER_AGENT } from '@/api/clientConfig';
import { APP_VERSION } from '@/services/update';
import type { SettingsUpdateCheckStatus } from '@/services/settingsUpdateCheck';
import type { Translations } from '@/store/i18n';

export function UpdateCheckSection({
  t,
  updateCheckStatus,
  isUpdateChecking,
  handleCheckForUpdates,
}: {
  t: Translations;
  updateCheckStatus: SettingsUpdateCheckStatus;
  isUpdateChecking: boolean;
  handleCheckForUpdates: () => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <UpdateIcon />
                  {t.checkForUpdates}
                </h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        {t.updateCurrentVersion}: v{APP_VERSION}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                        UA: {XPROJ_USER_AGENT}
                      </p>
                      {updateCheckStatus === 'upToDate' && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          ✓ {t.noUpdatesAvailable}
                        </p>
                      )}
                      {updateCheckStatus === 'error' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          ✗ {t.updateCheckFailed}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={isUpdateChecking || updateCheckStatus === 'checking'}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {(isUpdateChecking || updateCheckStatus === 'checking') ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t.checkingForUpdates}
                        </>
                      ) : (
                        <>
                          <UpdateIcon />
                          {t.checkForUpdates}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
  );
}
