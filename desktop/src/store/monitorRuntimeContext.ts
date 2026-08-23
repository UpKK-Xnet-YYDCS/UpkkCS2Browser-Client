import { createContext, type Dispatch, type SetStateAction } from 'react';
import type { MatchedServer, MonitorRule, MonitorStatus } from '@/services/monitorTypes';

export interface MonitorRuntimeValue {
  rules: MonitorRule[];
  setRules: Dispatch<SetStateAction<MonitorRule[]>>;
  interval: number;
  setInterval: Dispatch<SetStateAction<number>>;
  isEnabled: boolean;
  setIsEnabled: Dispatch<SetStateAction<boolean>>;
  status: MonitorStatus;
  setStatus: Dispatch<SetStateAction<MonitorStatus>>;
  currentMatches: MatchedServer[];
  setCountdown: Dispatch<SetStateAction<number>>;
}

export const MonitorRuntimeContext = createContext<MonitorRuntimeValue | null>(null);
export const MonitorCountdownContext = createContext<number | null>(null);
