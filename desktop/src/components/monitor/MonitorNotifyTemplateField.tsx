import {
  DEFAULT_ALERT_TITLE,
  DEFAULT_MESSAGE_TEMPLATE,
  MESSAGE_PLACEHOLDERS,
  formatNotificationMessage,
} from '@/services/monitor';
import {
  notifyPlaceholderLookupKey,
  notifyPreviewSample,
} from '@/services/monitorNotifyUi';
import type { Translations } from '@/store/i18n';

interface MonitorNotifyTemplateFieldProps {
  t: Translations;
  kind: 'title' | 'message';
  value: string;
  onChange: (value: string) => void;
}

export function MonitorNotifyTemplateField({ t, kind, value, onChange }: MonitorNotifyTemplateFieldProps) {
  const isTitle = kind === 'title';
  return (
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {isTitle ? t.monitorAlertTitle : t.monitorCustomMessageTemplate}
      </label>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {isTitle ? t.monitorAlertTitleDesc : t.monitorCustomMessageTemplateDesc}
      </div>
      {isTitle ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={DEFAULT_ALERT_TITLE}
          className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
        />
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={DEFAULT_MESSAGE_TEMPLATE}
          rows={2}
          className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
        />
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MESSAGE_PLACEHOLDERS.map(p => {
          const label = t[notifyPlaceholderLookupKey(p.key) as keyof typeof t] || p.desc;
          return (
            <span
              key={p.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              title={label}
              onClick={() => onChange((value || '') + p.key)}
            >
              <code>{p.key}</code>
              <span className="text-gray-400 dark:text-gray-500">{label}</span>
            </span>
          );
        })}
      </div>
      {value && (
        <div className="mt-2 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.monitorMessagePreview}</div>
          <div className="text-sm text-gray-900 dark:text-white break-all">
            {formatNotificationMessage(value, notifyPreviewSample())}
          </div>
        </div>
      )}
    </div>
  );
}
