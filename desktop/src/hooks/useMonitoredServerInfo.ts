import { useEffect, useState } from 'react';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';

export interface MonitoredServerDetails {
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  updatedAt: string;
}

export function useMonitoredServerInfo(allMonitoredServers: string[], lastCheckTime: string | null) {
  const [monitoredServerInfo, setMonitoredServerInfo] = useState<Map<string, MonitoredServerDetails>>(new Map());

  useEffect(() => {
    if (allMonitoredServers.length === 0) return;
    let cancelled = false;
    const fetchInfo = async () => {
      try {
        const infoMap = new Map<string, MonitoredServerDetails>();

        // Query ALL monitored servers via local A2S protocol
        for (const addr of allMonitoredServers) {
          const parsed = parseServerAddress(addr);
          if (!parsed) continue;
          const result = await queryServerA2S(parsed.ip, parsed.port);
          if (cancelled) return;
          if (result.success) {
            infoMap.set(addr, {
              name: result.name || addr,
              map: result.map_name || '--',
              players: result.real_players ?? result.players ?? 0,
              maxPlayers: result.max_players ?? 0,
              updatedAt: new Date().toLocaleTimeString(),
            });
          }
        }

        setMonitoredServerInfo(infoMap);
      } catch { /* ignore */ }
    };
    fetchInfo();
    return () => { cancelled = true; };
  }, [allMonitoredServers, lastCheckTime]); // re-fetch when check completes

  return monitoredServerInfo;
}
