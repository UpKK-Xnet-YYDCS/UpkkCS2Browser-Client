import type { Translations } from '@/store/i18n';

export interface MonitorIntervalControlsProps {
  t: Translations;
  interval: number;
  onChange: (seconds: number) => void;
}

export function MonitorIntervalControls({ t, interval, onChange }: MonitorIntervalControlsProps) {
  return (
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t.monitorInterval}
      </label>
      <select
        value={interval}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      >
        <option value={30}>30 {t.monitorSeconds}</option>
        <option value={60}>1 {t.monitorMinute}</option>
        <option value={120}>2 {t.monitorMinutes}</option>
        <option value={300}>5 {t.monitorMinutes}</option>
        <option value={600}>10 {t.monitorMinutes}</option>
      </select>
    </div>
  );
}
