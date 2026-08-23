interface MonitorNotifyToggleProps {
  enabled: boolean;
  enabledClass: string;
  onToggle: () => void;
}

export function MonitorNotifyToggle({ enabled, enabledClass, onToggle }: MonitorNotifyToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (enabled ? enabledClass : 'bg-gray-300 dark:bg-gray-600')}
    >
      <span className={'inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ' + (enabled ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}
