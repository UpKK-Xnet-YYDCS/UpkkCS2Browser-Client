import { useEffect, useState } from 'react';
import {
  addressesMissingFromCheck,
  detailsFromMonitorServers,
  queryMonitoredServerDetails,
  type CheckedMonitorServers,
  type MonitoredServerDetails,
} from '@/services/monitoredServerDetails';

export type { MonitoredServerDetails } from '@/services/monitoredServerDetails';

export function useMonitoredServerInfo(
  allMonitoredServers: string[],
  lastCheckTime: string | null,
  checkedServers: CheckedMonitorServers | null,
) {
  const [monitoredServerInfo, setMonitoredServerInfo] = useState<Map<string, MonitoredServerDetails>>(new Map());
  const addressKey = allMonitoredServers.join('\n');
  const checkedKey = checkedServers
    ? checkedServers.at + '\n' + checkedServers.servers.map(server => server.key).join('\n')
    : '';

  useEffect(() => {
    const addresses = addressKey ? addressKey.split('\n') : [];
    if (addresses.length === 0) return;
    const snapshot = checkedServers && checkedServers.at === lastCheckTime ? checkedServers.servers : null;
    let cancelled = false;

    const load = async () => {
      const fromCheck = snapshot
        ? detailsFromMonitorServers(snapshot, new Date().toLocaleTimeString())
        : new Map<string, MonitoredServerDetails>();
      const missing = snapshot ? addressesMissingFromCheck(addresses, snapshot) : addresses;
      if (missing.length === 0) {
        if (!cancelled) setMonitoredServerInfo(fromCheck);
        return;
      }
      try {
        const queried = await queryMonitoredServerDetails(missing);
        if (cancelled) return;
        for (const [key, value] of queried) fromCheck.set(key, value);
        setMonitoredServerInfo(fromCheck);
      } catch { /* ignore */ }
    };
    void load();
    return () => { cancelled = true; };
  }, [addressKey, checkedKey, checkedServers, lastCheckTime]);

  return monitoredServerInfo;
}
