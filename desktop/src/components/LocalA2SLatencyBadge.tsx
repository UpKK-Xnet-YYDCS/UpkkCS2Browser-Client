import type { ServerStatus } from '@/types';
import type { MouseEvent } from 'react';
import { getLatencyGrade, getLatencyLabel } from '@/services/latencyDisplay';

type LocalLatencyStatus = ServerStatus['local_latency_status'];

interface LocalA2SLatencyBadgeLabels {
  latency: string;
  queued: string;
  checking: string;
  unavailable: string;
  failed: string;
}

interface LocalA2SLatencyBadgeProps {
  status?: LocalLatencyStatus;
  latencyMs?: number;
  error?: string;
  labels: LocalA2SLatencyBadgeLabels;
  compact?: boolean;
  overlay?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

function getBadgeTitle(status: LocalLatencyStatus | undefined, labels: LocalA2SLatencyBadgeLabels, error?: string): string {
  if (status === 'queued') return labels.queued;
  if (status === 'checking') return labels.checking;
  if (status === 'unavailable') return labels.unavailable;
  if (status === 'failed') return error ? `${labels.failed}: ${error}` : labels.failed;
  return labels.latency;
}

function getDotClassName(status: LocalLatencyStatus | undefined, latencyMs: number | undefined): string {
  if (status === 'failed') {
    return 'bg-red-500 shadow-red-500/60';
  }
  if (status !== 'success') {
    return 'bg-gray-400 shadow-gray-400/40';
  }
  const grade = getLatencyGrade(latencyMs);
  if (grade === 'green') {
    return 'bg-emerald-400 shadow-emerald-400/60';
  }
  if (grade === 'yellow') {
    return 'bg-yellow-400 shadow-yellow-400/60';
  }
  if (grade === 'amber') {
    return 'bg-amber-500 shadow-amber-500/60';
  }
  if (grade === 'red') {
    return 'bg-red-500 shadow-red-500/60';
  }
  return 'bg-gray-400 shadow-gray-400/40';
}

function getBadgeClassName(overlay: boolean | undefined): string {
  if (overlay) {
    return 'border-white/15 bg-black/55 text-white shadow-black/20 backdrop-blur-sm';
  }
  return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
}

export function LocalA2SLatencyBadge({ status, latencyMs, error, labels, compact, overlay, onClick }: LocalA2SLatencyBadgeProps) {
  const text = getLatencyLabel({ status, latencyMs });
  const title = getBadgeTitle(status, labels, error);
  const sizeClassName = compact ? 'h-7 min-w-[62px] px-2' : 'h-8 min-w-[70px] px-2.5';
  const className = `inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-bold tabular-nums leading-none ${sizeClassName} ${getBadgeClassName(overlay)}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={`${className} cursor-pointer transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        title={title}
        aria-label={title}
        onClick={onClick}
      >
        <span className={`h-2 w-2 rounded-full shadow-sm ${getDotClassName(status, latencyMs)}`} />
        {text}
      </button>
    );
  }

  return (
    <span
      className={className}
      title={title}
      aria-label={title}
    >
      <span className={`h-2 w-2 rounded-full shadow-sm ${getDotClassName(status, latencyMs)}`} />
      {text}
    </span>
  );
}
