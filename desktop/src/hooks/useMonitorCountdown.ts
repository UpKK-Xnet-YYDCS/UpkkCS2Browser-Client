import { useContext } from 'react';
import { MonitorCountdownContext } from '@/store/monitorRuntimeContext';

export function useMonitorCountdown(): number {
  const countdown = useContext(MonitorCountdownContext);
  if (countdown === null) {
    throw new Error('useMonitorCountdown must be used within MonitorRuntimeProvider');
  }
  return countdown;
}
