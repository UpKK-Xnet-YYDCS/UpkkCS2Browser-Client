import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { formatCompactTokenCount } from '@/utils/aiTokens';

export type AITokenMeterLabels = {
  token: string;
  tokenInput: string;
  tokenOutput: string;
};

interface AITokenMeterProps {
  inputTokens: number;
  outputTokens: number;
  labels: AITokenMeterLabels;
  active?: boolean;
  className?: string;
}

function JumpNumber({ value }: { value: number }) {
  const [jumping, setJumping] = useState(false);
  const previous = useRef(value);
  const display = formatCompactTokenCount(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setJumping(true);
    const timer = window.setTimeout(() => setJumping(false), 280);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <span className={jumping ? 'inline-block tabular-nums ai-token-jump' : 'inline-block tabular-nums'}>
      {display}
    </span>
  );
}

export function AITokenMeter({
  inputTokens,
  outputTokens,
  labels,
  active = false,
  className = '',
}: AITokenMeterProps) {
  const rootClass = [
    'inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-amber-700/90 dark:text-amber-300/90',
    className,
  ].filter(Boolean).join(' ');
  const boltClass = active
    ? 'h-3.5 w-3.5 shrink-0 text-amber-500 ai-token-bolt'
    : 'h-3.5 w-3.5 shrink-0 text-amber-500';

  return (
    <div className={rootClass} aria-live="polite">
      <Zap className={boltClass} fill="currentColor" aria-hidden="true" />
      <span className="text-gray-500 dark:text-gray-400">{labels.token}</span>
      <span className="text-gray-500 dark:text-gray-400">{labels.tokenInput}:</span>
      <JumpNumber value={Math.max(0, inputTokens)} />
      <span className="text-gray-400 dark:text-gray-500">/</span>
      <span className="text-gray-500 dark:text-gray-400">{labels.tokenOutput}:</span>
      <JumpNumber value={Math.max(0, outputTokens)} />
    </div>
  );
}
