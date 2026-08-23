import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ServerStatus } from '@/types';
import { buildAlternateAutoJoinTarget, buildAlternateJoinTarget, useServerActionModals } from './useServerActionModals';

export function useServerJoinActions(server: ServerStatus, closeDropdown: () => void) {
  const modals = useServerActionModals();
  const alternates = server.alternate_servers;
  const hasAlternates = Boolean(alternates && alternates.length > 0);

  const handleConnect = (event: ReactMouseEvent) => {
    event.stopPropagation();
    modals.setJoinTarget(server);
  };

  const handleAutoJoin = (event: ReactMouseEvent) => {
    event.stopPropagation();
    modals.setAutoJoinTarget(null);
    modals.setShowAutoJoinModal(true);
  };

  const handleAutoJoinFromDropdown = (event: ReactMouseEvent) => {
    handleAutoJoin(event);
    closeDropdown();
  };

  const handleAutoJoinAlternate = (ip: string, port: string, event: ReactMouseEvent) => {
    event.stopPropagation();
    modals.setAutoJoinTarget(buildAlternateAutoJoinTarget(server, ip, port));
    modals.setShowAutoJoinModal(true);
    closeDropdown();
  };

  const handleLatencyClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    modals.setShowLatencyProbeModal(true);
  };

  const handleConnectAlternate = (ip: string, port: string, event: ReactMouseEvent) => {
    event.stopPropagation();
    const alternate = alternates?.find((item) => item.ip === ip && String(item.port) === String(port));
    modals.setJoinTarget(buildAlternateJoinTarget(server, ip, port, alternate));
    closeDropdown();
  };

  return {
    ...modals,
    alternates,
    hasAlternates,
    handleConnect,
    handleAutoJoin,
    handleAutoJoinFromDropdown,
    handleAutoJoinAlternate,
    handleLatencyClick,
    handleConnectAlternate,
  };
}
