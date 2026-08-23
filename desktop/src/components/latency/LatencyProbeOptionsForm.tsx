import { getNumericProbeInput } from '@/services/latencyProbeFormat';

interface ProbeNumberFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  fallback: number;
  onChange: (value: number) => void;
}

function ProbeNumberField({
  label,
  min,
  max,
  step,
  value,
  disabled,
  fallback,
  onChange,
}: ProbeNumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(getNumericProbeInput(event.target.value, fallback))}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </label>
  );
}

export interface LatencyProbeOptionsFormValues {
  intervalSeconds: number;
  durationSeconds: number;
  timeoutSeconds: number;
  retryCount: number;
  retryDelayMs: number;
}

interface LatencyProbeOptionsFormProps extends LatencyProbeOptionsFormValues {
  disabled: boolean;
  labels: {
    interval: string;
    duration: string;
    timeout: string;
    retries: string;
    retryDelay: string;
  };
  retryFallback: {
    retryCount: number;
    retryDelayMs: number;
  };
  onChange: (patch: Partial<LatencyProbeOptionsFormValues>) => void;
}

export function LatencyProbeOptionsForm({
  intervalSeconds,
  durationSeconds,
  timeoutSeconds,
  retryCount,
  retryDelayMs,
  disabled,
  labels,
  retryFallback,
  onChange,
}: LatencyProbeOptionsFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <ProbeNumberField
        label={labels.interval}
        min={1}
        max={60}
        step={1}
        value={intervalSeconds}
        disabled={disabled}
        fallback={1}
        onChange={(value) => onChange({ intervalSeconds: value })}
      />
      <ProbeNumberField
        label={labels.duration}
        min={5}
        max={1800}
        step={5}
        value={durationSeconds}
        disabled={disabled}
        fallback={120}
        onChange={(value) => onChange({ durationSeconds: value })}
      />
      <ProbeNumberField
        label={labels.timeout}
        min={0.5}
        max={5}
        step={0.5}
        value={timeoutSeconds}
        disabled={disabled}
        fallback={3}
        onChange={(value) => onChange({ timeoutSeconds: value })}
      />
      <ProbeNumberField
        label={labels.retries}
        min={0}
        max={5}
        step={1}
        value={retryCount}
        disabled={disabled}
        fallback={retryFallback.retryCount}
        onChange={(value) => onChange({ retryCount: value })}
      />
      <ProbeNumberField
        label={labels.retryDelay}
        min={0}
        max={3000}
        step={50}
        value={retryDelayMs}
        disabled={disabled}
        fallback={retryFallback.retryDelayMs}
        onChange={(value) => onChange({ retryDelayMs: value })}
      />
    </div>
  );
}
