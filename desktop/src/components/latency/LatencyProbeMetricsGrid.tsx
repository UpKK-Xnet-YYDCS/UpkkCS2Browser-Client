import type { LatencyProbeMetrics } from '@/services/latencyProbe';

interface LatencyProbeMetricsLabels {
  sent: string;
  received: string;
  packetLoss: string;
  attemptLoss: string;
  average: string;
  min: string;
  max: string;
  stability: string;
}

interface LatencyProbeMetricsGridProps {
  metrics: LatencyProbeMetrics;
  labels: LatencyProbeMetricsLabels;
}

function formatMs(value: number | undefined): string {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value ?? 0)} ms`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

export function LatencyProbeMetricsGrid({ metrics, labels }: LatencyProbeMetricsGridProps) {
  const items = [
    { label: labels.sent, value: String(metrics.sent) },
    { label: labels.received, value: String(metrics.received) },
    { label: labels.packetLoss, value: formatPercent(metrics.packetLossPercent) },
    { label: labels.attemptLoss, value: formatPercent(metrics.attemptLossPercent) },
    { label: labels.average, value: formatMs(metrics.avgLatencyMs) },
    { label: labels.min, value: formatMs(metrics.minLatencyMs) },
    { label: labels.max, value: formatMs(metrics.maxLatencyMs) },
    { label: labels.stability, value: formatMs(metrics.rttStabilityMs) },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</div>
          <div className="mt-1 text-lg font-black tabular-nums text-gray-900 dark:text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
