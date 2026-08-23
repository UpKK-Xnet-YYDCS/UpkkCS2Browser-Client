import { PlayIcon, StopIcon } from '@/components/monitor/MonitorIcons';
import { useMonitorCountdown } from '@/hooks/useMonitorCountdown';
import type { Translations } from '@/store/i18n';

interface MonitorFabProps {
  t: Translations;
  isEnabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function MonitorFab({ t, isEnabled, disabled, onToggle }: MonitorFabProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:scale-105 active:scale-95 ${
        isEnabled
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-500/30'
      }`}
    >
      {isEnabled ? (
        <>
          <StopIcon />
          <span>{t.monitorStop}</span>
          <MonitorFabCountdown />
        </>
      ) : (
        <>
          <PlayIcon />
          <span>{t.monitorStart}</span>
        </>
      )}
      {isEnabled && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
        </span>
      )}
    </button>
  );
}

function MonitorFabCountdown() {
  const countdown = useMonitorCountdown();
  return countdown > 0
    ? <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-xs">{countdown}s</span>
    : null;
}
