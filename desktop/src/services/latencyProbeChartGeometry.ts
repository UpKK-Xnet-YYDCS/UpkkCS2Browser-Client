export const LATENCY_PROBE_CHART_WIDTH = 560;
export const LATENCY_PROBE_CHART_HEIGHT = 220;
export const LATENCY_PROBE_CHART_PADDING = 42;
export const LATENCY_PROBE_CHART_GRID = [0, 0.25, 0.5, 0.75, 1] as const;

export function latencyProbePlotSize(): { plotWidth: number; plotHeight: number } {
  return {
    plotWidth: LATENCY_PROBE_CHART_WIDTH - LATENCY_PROBE_CHART_PADDING * 2,
    plotHeight: LATENCY_PROBE_CHART_HEIGHT - LATENCY_PROBE_CHART_PADDING * 2,
  };
}

export function latencyProbeMaxSequence(sequences: readonly number[]): number {
  return Math.max(1, ...sequences);
}

export function latencyProbeMaxMs(
  points: ReadonlyArray<{ latencyMs?: number; rttStabilityMs?: number }>,
): number {
  return Math.max(
    100,
    ...points.map((point) => point.latencyMs ?? 0),
    ...points.map((point) => point.rttStabilityMs ?? 0),
  );
}

export function latencyProbeX(sequence: number, maxSequence: number): number {
  if (maxSequence <= 1) return LATENCY_PROBE_CHART_PADDING;
  const { plotWidth } = latencyProbePlotSize();
  return LATENCY_PROBE_CHART_PADDING + ((sequence - 1) / (maxSequence - 1)) * plotWidth;
}

export function latencyProbeYForMs(value: number, maxMs: number): number {
  const { plotHeight } = latencyProbePlotSize();
  return LATENCY_PROBE_CHART_PADDING + plotHeight - (Math.min(value, maxMs) / maxMs) * plotHeight;
}

export function latencyProbeYForPercent(value: number): number {
  const { plotHeight } = latencyProbePlotSize();
  return LATENCY_PROBE_CHART_PADDING + plotHeight - (Math.min(value, 100) / 100) * plotHeight;
}

export function buildLatencyProbePath<T extends { sequence: number }>(
  points: readonly T[],
  maxSequence: number,
  getValue: (point: T) => number | undefined,
  getY: (value: number) => number,
): string {
  let hasSegment = false;
  return points
    .map((point) => {
      const value = getValue(point);
      if (!Number.isFinite(value)) {
        hasSegment = false;
        return '';
      }
      const x = latencyProbeX(point.sequence, maxSequence);
      const y = getY(value ?? 0);
      const command = hasSegment ? 'L' : 'M';
      hasSegment = true;
      return command + ' ' + x.toFixed(2) + ' ' + y.toFixed(2);
    })
    .filter(Boolean)
    .join(' ');
}

export function pickLatencyProbeHover<T extends { sequence: number }>(
  rect: Pick<DOMRect, 'width' | 'left'>,
  clientX: number,
  points: readonly T[],
): { point: T; x: number; left: number } | null {
  if (points.length === 0) return null;

  const maxSequence = latencyProbeMaxSequence(points.map((point) => point.sequence));
  const chartX = ((clientX - rect.left) / rect.width) * LATENCY_PROBE_CHART_WIDTH;
  const nearest = points.reduce((best, point) => {
    const bestDistance = Math.abs(latencyProbeX(best.sequence, maxSequence) - chartX);
    const pointDistance = Math.abs(latencyProbeX(point.sequence, maxSequence) - chartX);
    return pointDistance < bestDistance ? point : best;
  }, points[0]);
  const x = latencyProbeX(nearest.sequence, maxSequence);
  return {
    point: nearest,
    x,
    left: Math.min(82, Math.max(18, (x / LATENCY_PROBE_CHART_WIDTH) * 100)),
  };
}
