import { createContext, useContext } from 'react';
import type { UpdateCheckResult } from '@/services/update';

export interface UpdateContextType {
  triggerManualCheck: () => Promise<UpdateCheckResult>;
  isChecking: boolean;
}

export const UpdateContext = createContext<UpdateContextType | null>(null);

export function useUpdateCheck() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdateCheck must be used within UpdateProvider');
  }
  return context;
}
