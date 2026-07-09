import { LATENCY_FILTERS, getLatencyFilterLabel, type LatencyFilter as LatencyFilterValue } from '@/services/latencyDisplay';

interface LatencyFilterProps {
  value: LatencyFilterValue;
  onChange: (value: LatencyFilterValue) => void;
  label: string;
  allLabel: string;
  unknownLabel: string;
}

function displayFilterLabel(value: LatencyFilterValue, allLabel: string, unknownLabel: string): string {
  if (value === 'all') return allLabel;
  if (value === 'unknown') return unknownLabel;
  return getLatencyFilterLabel(value);
}

export function LatencyFilter({ value, onChange, label, allLabel, unknownLabel }: LatencyFilterProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      <span className="hidden whitespace-nowrap px-2 text-xs font-bold text-gray-500 dark:text-gray-400 sm:inline">
        {label}
      </span>
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {LATENCY_FILTERS.map(filter => (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={`h-8 flex-shrink-0 rounded-lg px-3 text-xs font-bold tabular-nums transition-all ${
              value === filter
                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300'
                : 'text-gray-500 hover:bg-white/70 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/70'
            }`}
            aria-pressed={value === filter}
            aria-label={`${label}: ${displayFilterLabel(filter, allLabel, unknownLabel)}`}
          >
            {displayFilterLabel(filter, allLabel, unknownLabel)}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { LatencyFilterValue };
