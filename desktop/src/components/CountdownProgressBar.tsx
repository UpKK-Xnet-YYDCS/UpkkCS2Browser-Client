import { countdownProgressLabel, countdownProgressPercent } from '@/services/countdownProgress';

interface CountdownProgressBarProps {
  secondsRemaining: number;
  totalSeconds: number;
  isLoading?: boolean;
}

export function CountdownProgressBar({ secondsRemaining, totalSeconds, isLoading }: CountdownProgressBarProps) {
  const progress = countdownProgressPercent(secondsRemaining, totalSeconds);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50 min-w-[120px]">
      <div className="flex-1 relative">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isLoading
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse w-full'
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}
            style={{ width: isLoading ? '100%' : `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 min-w-[28px] text-right tabular-nums">
        {countdownProgressLabel(secondsRemaining, isLoading)}
      </span>
    </div>
  );
}
