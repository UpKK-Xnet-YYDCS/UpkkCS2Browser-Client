import type { ServerStatus } from '../types/server.ts';

export function getNumericProbeInput(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function formatLatencyProbeServerLabel(server: Pick<ServerStatus, 'ip' | 'port' | 'display_address'> & {
  Addr?: string;
  Port?: string | number;
}): string {
  const ip = String(server.ip || server.Addr || '').trim();
  const port = String(server.port || server.Port || '').trim();
  const rawBaseAddress = String(server.display_address || ip).trim();
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  return port ? (baseAddress || ip) + ':' + port : baseAddress || ip;
}

export function formatProbeMs(value: number | undefined): string {
  if (!Number.isFinite(value)) return '--';
  return String(Math.round(value ?? 0)) + ' ms';
}

export function formatProbePercent(value: number): string {
  return value.toFixed(value % 1 === 0 ? 0 : 2) + '%';
}
