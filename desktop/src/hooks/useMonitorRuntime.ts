import { useContext } from 'react';
import { MonitorRuntimeContext, type MonitorRuntimeValue } from '@/store/monitorRuntimeContext';

export function useMonitorRuntime(): MonitorRuntimeValue {
  const runtime = useContext(MonitorRuntimeContext);
  if (!runtime) throw new Error('useMonitorRuntime must be used within MonitorRuntimeProvider');
  return runtime;
}
