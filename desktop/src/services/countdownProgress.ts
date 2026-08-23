export function countdownProgressPercent(secondsRemaining: number, totalSeconds: number): number {
  return totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
}

export function countdownProgressLabel(secondsRemaining: number, isLoading?: boolean): string {
  return isLoading ? '...' : String(secondsRemaining) + 's';
}
