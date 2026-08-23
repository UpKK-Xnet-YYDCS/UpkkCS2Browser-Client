import type { MouseEvent } from 'react';
import { useI18n } from '@/hooks/useI18n';

interface ServerCloudFavoritePromptProps {
  action: 'add' | 'remove';
  serverName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ServerCloudFavoritePrompt({
  action,
  serverName,
  onCancel,
  onConfirm,
}: ServerCloudFavoritePromptProps) {
  const { t } = useI18n();

  const stopAnd = (handler: () => void) => (event: MouseEvent) => {
    event.stopPropagation();
    handler();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={stopAnd(onCancel)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={event => event.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {action === 'add' ? t.addToCloudPrompt : t.removeFromCloudPrompt}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
          {action === 'add' ? t.addToCloudPromptDesc : t.removeFromCloudPromptDesc}
        </p>
        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-4 truncate">{serverName}</p>
        <div className="flex gap-3">
          <button
            onClick={stopAnd(onCancel)}
            className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={stopAnd(onConfirm)}
            className={`flex-1 px-4 py-2 rounded-xl text-white font-medium transition-colors ${
              action === 'add'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {action === 'add' ? t.addToFavorites : t.removeFavorite}
          </button>
        </div>
      </div>
    </div>
  );
}
