import { useContext } from 'react';
import { UserContext } from '@/store/userContext';
import type { UserContextType } from '@/store/userContext';

export function useUserStore(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserStore must be used within a UserProvider');
  }
  return context;
}
