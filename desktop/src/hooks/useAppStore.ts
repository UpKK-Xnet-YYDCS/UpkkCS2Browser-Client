import { useContext } from 'react';
import { AppContext } from '@/store/appContext';
import type { AppContextType } from '@/store';

export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
