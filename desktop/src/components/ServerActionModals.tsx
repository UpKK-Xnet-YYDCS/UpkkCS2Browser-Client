import { lazy, Suspense } from 'react';
import type { ServerStatus } from '@/types';

const AutoJoinModal = lazy(() => import('./AutoJoinModal').then(module => ({ default: module.AutoJoinModal })));
const LatencyProbeModal = lazy(() => import('./LatencyProbeModal').then(module => ({ default: module.LatencyProbeModal })));
const JoinServerConfirmModal = lazy(() => import('./JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));

interface ServerActionModalsProps {
  server: ServerStatus;
  showAutoJoinModal: boolean;
  showLatencyProbeModal: boolean;
  autoJoinTarget?: ServerStatus | null;
  joinTarget?: ServerStatus | null;
  showJoinConfirm?: boolean;
  onCloseAutoJoin: () => void;
  onCloseLatency: () => void;
  onCloseJoin: () => void;
}

export function ServerActionModals({
  server,
  showAutoJoinModal,
  showLatencyProbeModal,
  autoJoinTarget,
  joinTarget,
  showJoinConfirm = false,
  onCloseAutoJoin,
  onCloseLatency,
  onCloseJoin,
}: ServerActionModalsProps) {
  const joinServer = joinTarget ?? (showJoinConfirm ? server : null);

  return (
    <>
      {showAutoJoinModal && (
        <Suspense fallback={null}>
          <AutoJoinModal
            server={autoJoinTarget || server}
            onClose={onCloseAutoJoin}
          />
        </Suspense>
      )}
      {showLatencyProbeModal && (
        <Suspense fallback={null}>
          <LatencyProbeModal
            server={server}
            onClose={onCloseLatency}
          />
        </Suspense>
      )}
      {joinServer && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal
            server={joinServer}
            latencyMs={joinServer.local_latency_ms}
            onClose={onCloseJoin}
          />
        </Suspense>
      )}
    </>
  );
}
