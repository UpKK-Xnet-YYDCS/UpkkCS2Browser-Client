import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { UpdateContext, type UpdateContextType } from '@/contexts/updateContext';
import { logInfo, logWarn } from '@/services/operationLog';
import type { UpdateCheckResult, UpdateInfo } from '@/services/update';

const UpdateModalView = lazy(() => import('@/components/UpdateModal').then(module => ({ default: module.UpdateModalView })));

function loadUpdateModule() {
  return Promise.all([
    import('@/services/update'),
    import('@/services/updatePrompt'),
  ]);
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const triggerManualCheck = useCallback(async (): Promise<UpdateCheckResult> => {
    setIsChecking(true);
    try {
      const [{ checkForUpdates }] = await loadUpdateModule();
      const result = await checkForUpdates();
      if (result.hasUpdate && result.updateInfo) {
        setUpdateInfo(result.updateInfo);
        setIsOpen(true);
      }
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void loadUpdateModule();
  }, []);

  useEffect(() => {
    const performAutoCheck = async () => {
      try {
        const [{ checkForUpdates, isUpdateDismissed }, { resolveAutoUpdatePrompt }] = await loadUpdateModule();
        const decision = resolveAutoUpdatePrompt(await checkForUpdates(), isUpdateDismissed);
        if (decision.kind === 'dismissed') {
          logInfo('Update', 'User has dismissed version ' + decision.version);
          return;
        }
        if (decision.kind === 'prompt') {
          setUpdateInfo(decision.info as UpdateInfo);
          setIsOpen(true);
          return;
        }
        if (decision.kind === 'error') {
          logWarn('Update', 'Auto check failed: ' + decision.error);
        }
      } catch (err) {
        console.error('[Update] Unexpected error during auto check:', err);
      }
    };

    const timer = setTimeout(performAutoCheck, 1500);
    return () => clearTimeout(timer);
  }, []);

  const contextValue: UpdateContextType = {
    triggerManualCheck,
    isChecking,
  };

  return (
    <UpdateContext.Provider value={contextValue}>
      {children}
      {isOpen && (
        <Suspense fallback={null}>
          <UpdateModalView
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            updateInfo={updateInfo}
          />
        </Suspense>
      )}
    </UpdateContext.Provider>
  );
}
