import { LATENCY_FILTERS, getLatencyFilterLabel } from '@/services/latencyDisplay';
import type { LatencyFilterValue } from '@/types/ui';

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
    <div className="relative flex h-10 flex-shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100/90 shadow-sm transition-all hover:border-blue-300 hover:bg-white dark:border-gray-700 dark:bg-gray-800/90 dark:hover:border-blue-500/60 dark:hover:bg-gray-800">
      <span className="whitespace-nowrap border-r border-gray-200 px-2.5 text-xs font-black text-gray-500 dark:border-gray-700 dark:text-gray-300">
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value as LatencyFilterValue)}
        className="h-full w-[108px] appearance-none bg-transparent py-0 pl-2.5 pr-7 text-xs font-black tabular-nums text-gray-800 outline-none transition-colors hover:text-blue-600 focus:text-blue-600 dark:text-gray-100 dark:hover:text-blue-300 dark:focus:text-blue-300"
        aria-label={label}
        title={`${label}: ${displayFilterLabel(value, allLabel, unknownLabel)}`}
      >
        {LATENCY_FILTERS.map(filter => (
          <option
            key={filter}
            value={filter}
            className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            {displayFilterLabel(filter, allLabel, unknownLabel)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
