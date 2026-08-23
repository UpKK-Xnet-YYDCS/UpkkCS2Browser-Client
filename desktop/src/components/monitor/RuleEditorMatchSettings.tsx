import type { Dispatch, SetStateAction } from 'react';
import type { Translations } from '@/store/i18n';
import type { MonitorRule } from '@/services/monitor';

const fieldClass = 'w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const compactFieldClass = 'w-32 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

export function RuleEditorMatchSettings({
  t,
  editRule,
  setEditRule,
}: {
  t: Translations;
  editRule: MonitorRule;
  setEditRule: Dispatch<SetStateAction<MonitorRule>>;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.monitorMinPlayers}
        </label>
        <input
          type="number"
          min={0}
          max={128}
          value={editRule.minPlayers}
          onChange={e => setEditRule(prev => ({ ...prev, minPlayers: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
          className={compactFieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.monitorCooldown}
        </label>
        <select
          value={editRule.cooldownSeconds}
          onChange={e => setEditRule(prev => ({ ...prev, cooldownSeconds: parseInt(e.target.value, 10) }))}
          className={fieldClass}
        >
          <option value={60}>1 {t.monitorMinute}</option>
          <option value={300}>5 {t.monitorMinutes}</option>
          <option value={600}>10 {t.monitorMinutes}</option>
          <option value={1800}>30 {t.monitorMinutes}</option>
          <option value={3600}>1 {t.monitorHour}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.monitorRequiredMatches}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.monitorRequiredMatchesHint}</p>
        <select
          value={editRule.requiredMatches ?? 1}
          onChange={e => setEditRule(prev => ({ ...prev, requiredMatches: parseInt(e.target.value, 10) }))}
          className={fieldClass}
        >
          <option value={1}>1 {t.monitorMatchTimes} ({t.monitorMatchImmediate})</option>
          <option value={2}>2 {t.monitorMatchTimes}</option>
          <option value={3}>3 {t.monitorMatchTimes}</option>
          <option value={5}>5 {t.monitorMatchTimes}</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorAutoJoin}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorAutoJoinDesc}</div>
        </div>
        <button
          onClick={() => setEditRule(prev => ({ ...prev, autoJoin: !prev.autoJoin }))}
          className={'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ' + (editRule.autoJoin ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600')}
        >
          <span className={'inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ' + (editRule.autoJoin ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          {t.monitorAutoJoinWarning}
        </p>
      </div>
    </>
  );
}

