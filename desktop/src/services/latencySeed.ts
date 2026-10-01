import type { ServerStatus } from '@/types';
import { latencyAddressKey } from './a2sLatencyPolicy.ts';
import type { LocalLatencyScheduler, LocalLatencySnapshot } from './a2sLatencyTypes.ts';
import { getServerLatencyTarget } from './latencyDisplay.ts';

export interface FreshLatencySeed {
  address: string;
  snapshot: LocalLatencySnapshot;
}

export function freshSuccessLatencySeeds(
  servers: readonly ServerStatus[],
  now: number,
  ttlMs: number,
): FreshLatencySeed[] {
  const seeds: FreshLatencySeed[] = [];
  for (const server of servers) {
    if (server.local_latency_status !== 'success' || !Number.isFinite(server.local_latency_ms)) continue;
    const updatedAt = Date.parse(server.local_latency_updated_at ?? '');
    if (!Number.isFinite(updatedAt) || now - updatedAt >= ttlMs) continue;
    const target = getServerLatencyTarget(server);
    if (!target) continue;
    seeds.push({
      address: latencyAddressKey(target.ip, target.port),
      snapshot: {
        status: 'success',
        latencyMs: Math.max(0, Math.round(server.local_latency_ms ?? 0)),
        updatedAt,
      },
    });
  }
  return seeds;
}

export async function rememberFreshServerLatency(
  scheduler: LocalLatencyScheduler,
  servers: readonly ServerStatus[],
  now: number,
  ttlMs: number,
): Promise<void> {
  for (const seed of freshSuccessLatencySeeds(servers, now, ttlMs)) {
    scheduler.remember(seed.address, seed.snapshot);
  }
}
