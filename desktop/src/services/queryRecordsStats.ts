import type { A2SLatencyStatPoint } from '@/api/history';

export function formatQueryNodeLabel(
  isFromNode: boolean,
  nodeName: string,
  localLabel: string,
  remoteLabel: string,
): string {
  const normalized = (nodeName || '').trim();
  const isLocal = !isFromNode || normalized.toLowerCase() === 'local';
  if (isLocal) return localLabel;
  return remoteLabel + ': ' + (normalized || '-');
}

export function formatLatencyMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0.0';
  return value.toFixed(1);
}

/** Failure is binary for charting: any failed sample in the bucket => 100%, else 0%. */
export function failureFlag(point: Pick<A2SLatencyStatPoint, 'query_count' | 'success_count'>): 0 | 100 {
  if (point.query_count <= 0) return 0;
  return point.success_count < point.query_count ? 100 : 0;
}

export function calculateStats(stats: Array<Pick<A2SLatencyStatPoint, 'query_count' | 'success_count' | 'avg_latency' | 'max_latency'>>) {
  let totalQueries = 0;
  let totalSuccess = 0;
  let totalLatency = 0;
  let maxLatency = 0;
  let latencyCount = 0;

  for (const s of stats) {
    totalQueries += s.query_count;
    totalSuccess += s.success_count;
    if (s.avg_latency > 0 && s.success_count > 0) {
      totalLatency += s.avg_latency * s.success_count;
      latencyCount += s.success_count;
    }
    if (s.success_count > 0 && s.max_latency > maxLatency) {
      maxLatency = s.max_latency;
    }
  }

  return {
    totalQueries,
    avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    maxLatency,
    successRate: totalQueries > 0 ? (totalSuccess / totalQueries) * 100 : 0,
  };
}
