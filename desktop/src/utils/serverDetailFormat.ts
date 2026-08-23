export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return String(hours) + 'h ' + String(minutes) + 'm';
  return String(minutes) + 'm';
}
