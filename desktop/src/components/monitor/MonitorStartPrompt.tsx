import { PlayIcon } from '@/components/monitor/MonitorIcons';
import type { Translations } from '@/store/i18n';

interface MonitorStartPromptProps {
  t: Translations;
  isEnabled: boolean;
  onLater: () => void;
  onConfirm: () => void;
}

export function MonitorStartPrompt({ t, isEnabled, onLater, onConfirm }: MonitorStartPromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500">
          <PlayIcon />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isEnabled ? t.monitorRestartPrompt : t.monitorStartPrompt}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t.monitorStartPromptDesc}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onLater}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.monitorLater}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
          >
            {isEnabled ? t.monitorRestart : t.monitorStart}
          </button>
        </div>
      </div>
    </div>
  );
}

