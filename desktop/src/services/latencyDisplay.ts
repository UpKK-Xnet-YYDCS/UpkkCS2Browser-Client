import type { ServerStatus } from '@/types';
import type { LocalLatencySnapshot, LocalLatencyTarget } from './a2sLatency';

export type LatencyGrade = 'green' | 'yellow' | 'amber' | 'red' | 'unknown';
export type LatencyFilter = 'all' | 'le80' | 'le150' | 'le250' | 'gt250' | 'unknown';

interface LatencyLabelInput {
  status?: ServerStatus['local_latency_status'];
  latencyMs?: number;
}

export const LATENCY_FILTERS: LatencyFilter[] = ['all', 'le80', 'le150', 'le250', 'gt250', 'unknown'];

export function getLatencyGrade(latencyMs: number | undefined): LatencyGrade {
  if (!Number.isFinite(latencyMs)) return 'unknown';
  const value = Math.max(0, Math.round(latencyMs ?? 0));
  if (value <= 80) return 'green';
  if (value <= 150) return 'yellow';
  if (value <= 250) return 'amber';
  return 'red';
}

export function getLatencyLabel(input: LatencyLabelInput): string {
  if (input.status === 'success' && Number.isFinite(input.latencyMs)) {
    return `${Math.round(input.latencyMs ?? 0)} ms`;
  }
  if (input.status === 'queued' || input.status === 'checking') {
    return '...';
  }
  if (input.status === 'failed') {
    return '超时';
  }
  return '--';
}

export function getServerLatencyMs(server: ServerStatus): number | undefined {
  if (server.local_latency_status !== 'success') return undefined;
  return Number.isFinite(server.local_latency_ms) ? server.local_latency_ms : undefined;
}

function isPendingLatency(server: ServerStatus): boolean {
  return server.local_latency_status === undefined ||
    server.local_latency_status === 'queued' ||
    server.local_latency_status === 'checking';
}

export function getServerLatencyTarget(server: ServerStatus): LocalLatencyTarget | null {
  const serverIp = String(server.ip || server.Addr || '').trim();
  const serverPort = String(server.port || server.Port || '').trim();
  if (!serverIp || !serverPort) return null;

  const rawBaseAddress = String(server.display_address || serverIp).trim();
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  const ip = baseAddress || serverIp;
  return {
    key: `${ip}:${serverPort}`,
    ip,
    port: serverPort,
  };
}

export function applyLatencySnapshot(server: ServerStatus, snapshot?: LocalLatencySnapshot): ServerStatus {
  if (!snapshot) return server;

  return {
    ...server,
    local_latency_status: snapshot.status,
    local_latency_ms: snapshot.latencyMs,
    local_latency_error: snapshot.error,
    local_latency_updated_at: snapshot.updatedAt ? new Date(snapshot.updatedAt).toISOString() : undefined,
  };
}

export function isSameLatencySnapshot(a: LocalLatencySnapshot | undefined, b: LocalLatencySnapshot): boolean {
  return Boolean(a) &&
    a?.status === b.status &&
    a?.latencyMs === b.latencyMs &&
    a?.error === b.error &&
    a?.updatedAt === b.updatedAt;
}

export function matchesLatencyFilter(server: ServerStatus, filter: LatencyFilter): boolean {
  if (filter === 'all') return true;

  const latencyMs = getServerLatencyMs(server);
  if (!Number.isFinite(latencyMs)) {
    if (filter !== 'unknown' && isPendingLatency(server)) return true;
    return filter === 'unknown';
  }

  const value = latencyMs ?? 0;
  if (filter === 'le80') return value <= 80;
  if (filter === 'le150') return value <= 150;
  if (filter === 'le250') return value <= 250;
  if (filter === 'gt250') return value > 250;
  return false;
}

export function getLatencyFilterLabel(filter: LatencyFilter): string {
  if (filter === 'le80') return '≤80 ms';
  if (filter === 'le150') return '≤150 ms';
  if (filter === 'le250') return '≤250 ms';
  if (filter === 'gt250') return '>250 ms';
  if (filter === 'unknown') return '--';
  return 'All';
}
