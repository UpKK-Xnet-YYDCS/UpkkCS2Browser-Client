import type { ReactNode } from 'react';
import { TestIcon } from '@/components/monitor/MonitorIcons';
import {
  notifyChannelTestButtonClass,
  notifyTestLabel,
} from '@/services/monitorNotifyUi';
import type { Translations } from '@/store/i18n';
import { MonitorNotifyToggle } from './MonitorNotifyToggle';

export function MonitorNotifyChannelTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
  );
}

export function MonitorNotifyTestButton({
  result,
  idleClass,
  idleLabel,
  onClick,
  t,
}: {
  result: string | null;
  idleClass: string;
  idleLabel: string;
  onClick: () => void;
  t: Translations;
}) {
  return (
    <button
      onClick={onClick}
      disabled={result === 'testing'}
      className={notifyChannelTestButtonClass(result, idleClass)}
    >
      <TestIcon />
      {notifyTestLabel(result, {
        testing: t.monitorTesting,
        success: t.monitorTestSuccess,
        failed: t.monitorTestFailed,
        idle: idleLabel,
      })}
    </button>
  );
}

export function MonitorNotifyChannelCard({
  icon,
  title,
  description,
  enabled,
  enabledClass,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  enabledClass: string;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <MonitorNotifyChannelTitle icon={icon} title={title} description={description} />
        <MonitorNotifyToggle enabled={enabled} enabledClass={enabledClass} onToggle={onToggle} />
      </div>
      {children}
    </div>
  );
}
