import type { Translations } from '@/store/i18n';
import { XMarkIcon } from './MonitorIcons';

export function RuleEditorMapPatterns({
  t,
  mapInput,
  mapPatterns,
  onMapInputChange,
  onAdd,
  onRemove,
}: {
  t: Translations;
  mapInput: string;
  mapPatterns: string[];
  onMapInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (pattern: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t.monitorMapPatterns}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.monitorMapPatternsHint}</p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={mapInput}
          onChange={e => onMapInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          placeholder={t.monitorMapPatternPlaceholder}
          className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
          onClick={onAdd}
          className={'px-4 py-2.5 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium ' + (mapInput.trim() ? 'bg-blue-500 animate-pulse' : 'bg-blue-500')}
        >
          {t.monitorAdd}
        </button>
      </div>
      {mapInput.trim() && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1 font-medium">
          {t.monitorMapPatternAddReminder}
        </p>
      )}
      {mapPatterns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mapPatterns.map(pattern => (
            <span
              key={pattern}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
            >
              <code className="font-mono">{pattern}</code>
              <button
                onClick={() => onRemove(pattern)}
                className="hover:text-red-500 transition-colors"
              >
                <XMarkIcon />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

