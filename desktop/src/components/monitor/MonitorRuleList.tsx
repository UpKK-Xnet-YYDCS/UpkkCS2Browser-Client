import {
  BellIcon,
  DesktopIcon,
  DiscordIcon,
  EditIcon,
  PlusIcon,
  ServerChanIcon,
  TrashIcon,
} from '@/components/monitor/MonitorIcons';
import type { MonitorRule } from '@/services/monitor';
import type { Translations } from '@/store/i18n';

export interface MonitorRuleListProps {
  t: Translations;
  rules: MonitorRule[];
  onToggle: (ruleId: string) => void;
  onEdit: (rule: MonitorRule) => void;
  onDelete: (ruleId: string) => void;
  onCreate: () => void;
}

export function MonitorRuleList({
  t, rules, onToggle, onEdit, onDelete, onCreate,
}: MonitorRuleListProps) {
  return (
    <>
        {/* Rules Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t.monitorRules}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({rules.length})</span>
            </h2>
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium shadow-lg shadow-blue-500/25"
            >
              <PlusIcon />
              {t.monitorAddRule}
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <BellIcon />
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">{t.monitorNoRules}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.monitorNoRulesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    rule.enabled
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggle(rule.id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                          rule.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                          rule.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{rule.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{`${rule.selectedServers.length} ${t.monitorServers}`}</span>
                          <span>•</span>
                          <span>{rule.mapPatterns.length} {t.monitorPatterns}</span>
                          {rule.minPlayers > 0 && (
                            <>
                              <span>•</span>
                              <span>≥{rule.minPlayers} {t.players}</span>
                            </>
                          )}
                          {(rule.requiredMatches ?? 1) > 1 && (
                            <>
                              <span>•</span>
                              <span>×{rule.requiredMatches} {t.monitorMatchTimes}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {rule.notifyDesktop && <DesktopIcon />}
                            {rule.notifyDiscord && <DiscordIcon />}
                            {rule.notifyServerChan && <ServerChanIcon />}
                          </span>
                          {rule.autoJoin && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-400">▶ {t.monitorAutoJoin}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => onEdit({ ...rule })}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title={t.monitorEditRule}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => onDelete(rule.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title={t.monitorDeleteRule}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Map patterns preview */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rule.mapPatterns.map(p => (
                      <code key={p} className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
