import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import {
  openDownloadUrl,
  setDismissedVersion,
  type UpdateInfo,
  APP_VERSION
} from '@/services/update';
import { UPDATE_DOWNLOAD_FEEDBACK_MS, canDismissUpdate } from '@/services/updateModalPolicy';
import { DownloadIcon, SparkleIcon, UpdateIcon, XIcon } from './updateIcons';

interface UpdateModalViewProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  updateInfo: UpdateInfo | null;
}

export function UpdateModalView({ isOpen, setIsOpen, updateInfo }: UpdateModalViewProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!updateInfo?.download_url) {
      setError(t.updateNoDownloadUrl);
      return;
    }
    
    setIsDownloading(true);
    
    try {
      await openDownloadUrl(updateInfo.download_url);
      
      // Don't close modal immediately - let user see the download started
      setTimeout(() => {
        setIsDownloading(false);
        if (canDismissUpdate(updateInfo.mandatory)) {
          setIsOpen(false);
        }
      }, UPDATE_DOWNLOAD_FEEDBACK_MS);
    } catch {
      setError(t.updateDownloadFailed);
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    if (updateInfo && canDismissUpdate(updateInfo.mandatory)) {
      setDismissedVersion(updateInfo.version);
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    if (!canDismissUpdate(updateInfo?.mandatory)) {
      // For mandatory updates, don't allow closing
      return;
    }
    setIsOpen(false);
  };

  // Don't render anything if not open or no update info
  if (!isOpen || !updateInfo) {
    return null;
  }

  const isMandatory = !canDismissUpdate(updateInfo.mandatory);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
              <UpdateIcon />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.updateAvailable}</h2>
              <p className="text-sm text-white/80">{t.updateNewVersion}</p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Version info */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.updateCurrentVersion}</p>
              <p className="font-semibold text-gray-900 dark:text-white">v{APP_VERSION}</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.updateLatestVersion}</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">v{updateInfo.version}</p>
            </div>
          </div>

          {/* Release date */}
          {updateInfo.release_date && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.updateReleaseDate}: {updateInfo.release_date}
            </p>
          )}

          {/* Changelog */}
          {updateInfo.changelog && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SparkleIcon />
                <span className="font-medium text-gray-900 dark:text-white">{t.updateChangelog}</span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">{updateInfo.changelog}</pre>
              </div>
            </div>
          )}

          {/* Mandatory update warning */}
          {isMandatory && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ {t.updateMandatory}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          {!isMandatory && (
            <button
              onClick={handleDismiss}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t.updateLater}
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t.updateDownloading}
              </>
            ) : (
              <>
                <DownloadIcon />
                {t.updateDownloadNow}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

