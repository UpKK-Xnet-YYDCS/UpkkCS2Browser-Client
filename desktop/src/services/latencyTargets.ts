import type { ServerStatus } from '@/types';
import type { LocalLatencyTarget } from './a2sLatencyTypes.ts';
import { latencyAddressKey } from './a2sLatencyPolicy.ts';
import { getServerLatencyTarget } from './latencyDisplay.ts';

export function latencyTargetAddress(target: Pick<LocalLatencyTarget, 'ip' | 'port'>): string {
  return latencyAddressKey(target.ip, target.port);
}

export function getUniqueLatencyTargets(servers: readonly ServerStatus[]): LocalLatencyTarget[] {
  const targetsByAddress = new Map<string, LocalLatencyTarget>();

  for (const server of servers) {
    const target = getServerLatencyTarget(server);
    if (!target) continue;

    const address = latencyTargetAddress(target);
    const existing = targetsByAddress.get(address);
    if (!existing) {
      targetsByAddress.set(address, target);
      continue;
    }

    targetsByAddress.set(address, {
      ...existing,
      priority: Math.min(existing.priority ?? 0, target.priority ?? 0),
    });
  }

  return Array.from(targetsByAddress.values());
}

export function excludeForegroundTargets(
  targets: LocalLatencyTarget[],
  foregroundServers: readonly ServerStatus[] | undefined,
): LocalLatencyTarget[] {
  if (!foregroundServers || foregroundServers.length === 0) {
    return targets;
  }

  const foregroundAddresses = new Set(
    getUniqueLatencyTargets(foregroundServers).map(latencyTargetAddress),
  );

  return targets.filter(target => !foregroundAddresses.has(latencyTargetAddress(target)));
}
