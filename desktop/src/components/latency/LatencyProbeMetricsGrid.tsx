import type { LatencyProbeMetrics } from '@/services/latencyProbe';
import { formatProbeMs, formatProbePercent } from '@/services/latencyProbeFormat';

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

export function LatencyProbeMetricsGrid({ metrics, labels }: LatencyProbeMetricsGridProps) {
  const items = [
    { label: labels.sent, value: String(metrics.sent) },
    { label: labels.received, value: String(metrics.received) },
    { label: labels.packetLoss, value: formatProbePercent(metrics.packetLossPercent) },
    { label: labels.attemptLoss, value: formatProbePercent(metrics.attemptLossPercent) },
    { label: labels.average, value: formatProbeMs(metrics.avgLatencyMs) },
    { label: labels.min, value: formatProbeMs(metrics.minLatencyMs) },
    { label: labels.max, value: formatProbeMs(metrics.maxLatencyMs) },
    { label: labels.stability, value: formatProbeMs(metrics.rttStabilityMs) },
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
