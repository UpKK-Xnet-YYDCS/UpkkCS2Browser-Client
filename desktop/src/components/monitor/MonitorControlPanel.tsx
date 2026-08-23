import type { ReactNode } from 'react';
import { MonitorIntervalControls } from '@/components/monitor/MonitorIntervalControls';
import { PlayIcon, StopIcon } from '@/components/monitor/MonitorIcons';
import { MonitorNotifyPanel } from '@/components/monitor/MonitorNotifyPanel';
import { useMonitorCountdown } from '@/hooks/useMonitorCountdown';
import type { MonitorNotifySettings } from '@/services/monitor';
import type { Translations } from '@/store/i18n';

interface MonitorControlPanelProps {
  t: Translations;
  isEnabled: boolean;
  enabledRuleCount: number;
  checkCount: number;
  matchCount: number;
  lastCheckLabel: string;
  lastError: string | null;
  interval: number;
  notifySettings: MonitorNotifySettings;
  desktopTestResult: string | null;
  discordTestResult: string | null;
  serverChanTestResult: string | null;
  customWebhookTestResult: string | null;
  onToggle: () => void;
  onIntervalChange: (interval: number) => void;
  updateNotifySettings: (settings: Partial<MonitorNotifySettings>) => void;
  handleTestDesktop: () => void;
  handleTestWebhook: () => void;
  handleTestServerChan: () => void;
  handleTestCustomWebhook: () => void;
}

export function MonitorControlPanel(props: MonitorControlPanelProps) {
  const { t } = props;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <PlayIcon />
          {t.monitorControl}
        </h2>
        <button
          onClick={props.onToggle}
          disabled={props.enabledRuleCount === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            props.isEnabled
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
          }`}
        >
          {props.isEnabled ? <StopIcon /> : <PlayIcon />}
          {props.isEnabled ? t.monitorStop : t.monitorStart}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Stat value={props.checkCount} label={t.monitorChecks} />
        <Stat value={props.matchCount} label={t.monitorMatches} emphasize />
        <Stat value={props.lastCheckLabel} label={t.monitorLastCheck} small />
        <MonitorNextCheckStat isEnabled={props.isEnabled} label={t.monitorNextCheck} />
      </div>

      {props.isEnabled && (
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-600 dark:text-green-400 font-medium">{t.monitorRunning}</span>
        </div>
      )}

      {props.lastError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {props.lastError}
        </div>
      )}

      <MonitorIntervalControls t={t} interval={props.interval} onChange={props.onIntervalChange} />
      <MonitorNotifyPanel
        t={t}
        notifySettings={props.notifySettings}
        updateNotifySettings={props.updateNotifySettings}
        desktopTestResult={props.desktopTestResult}
        discordTestResult={props.discordTestResult}
        serverChanTestResult={props.serverChanTestResult}
        customWebhookTestResult={props.customWebhookTestResult}
        handleTestDesktop={props.handleTestDesktop}
        handleTestWebhook={props.handleTestWebhook}
        handleTestServerChan={props.handleTestServerChan}
        handleTestCustomWebhook={props.handleTestCustomWebhook}
      />
    </div>
  );
}

function MonitorNextCheckStat({ isEnabled, label }: { isEnabled: boolean; label: string }) {
  const countdown = useMonitorCountdown();
  return <Stat value={isEnabled && countdown > 0 ? `${countdown}s` : '--'} label={label} small />;
}

function Stat({ value, label, emphasize, small }: { value: ReactNode; label: string; emphasize?: boolean; small?: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
      <div className={
        small
          ? 'text-sm font-medium text-gray-900 dark:text-white'
          : emphasize
            ? 'text-2xl font-bold text-green-600 dark:text-green-400'
            : 'text-2xl font-bold text-gray-900 dark:text-white'
      }>
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}
