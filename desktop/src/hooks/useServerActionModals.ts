import { useState } from 'react';
import type { AlternateServer, ServerStatus } from '@/types';

export function buildAlternateJoinTarget(
  server: ServerStatus,
  ip: string,
  port: string,
  alternate?: Pick<AlternateServer, 'real_players' | 'max_players' | 'country_code' | 'country_name'> | null,
): ServerStatus {
  return {
    ...server,
    ip,
    port: String(port),
    display_address: ip,
    players: alternate?.real_players ?? server.players,
    real_players: alternate?.real_players ?? server.real_players,
    max_players: alternate?.max_players ?? server.max_players,
    country_code: alternate?.country_code ?? server.country_code,
    country_name: alternate?.country_name ?? server.country_name,
  } as ServerStatus;
}

export function buildAlternateAutoJoinTarget(
  server: ServerStatus,
  ip: string,
  port: string,
): ServerStatus {
  return { ...server, ip, port: String(port), display_address: ip } as ServerStatus;
}

export function useServerActionModals() {
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [showLatencyProbeModal, setShowLatencyProbeModal] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [autoJoinTarget, setAutoJoinTarget] = useState<ServerStatus | null>(null);
  const [joinTarget, setJoinTarget] = useState<ServerStatus | null>(null);

  const openJoin = (target: ServerStatus) => setJoinTarget(target);
  const openAutoJoin = (target: ServerStatus | null = null) => {
    setAutoJoinTarget(target);
    setShowAutoJoinModal(true);
  };
  const openLatency = () => setShowLatencyProbeModal(true);
  const openJoinConfirm = () => setShowJoinConfirm(true);
  const closeJoin = () => setJoinTarget(null);
  const closeAutoJoin = () => {
    setShowAutoJoinModal(false);
    setAutoJoinTarget(null);
  };
  const closeLatency = () => setShowLatencyProbeModal(false);
  const closeJoinConfirm = () => setShowJoinConfirm(false);

  return {
    showAutoJoinModal,
    showLatencyProbeModal,
    showJoinConfirm,
    autoJoinTarget,
    joinTarget,
    setShowAutoJoinModal,
    setShowLatencyProbeModal,
    setAutoJoinTarget,
    setJoinTarget,
    openJoin,
    openAutoJoin,
    openLatency,
    openJoinConfirm,
    closeJoin,
    closeAutoJoin,
    closeLatency,
    closeJoinConfirm,
  };
}
