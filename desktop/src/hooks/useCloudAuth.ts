import { useContext } from 'react';
import { CloudAuthContext } from '@/contexts/cloudAuthContext';

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (!context) throw new Error('useCloudAuth must be used within CloudAuthProvider');
  return context;
}
