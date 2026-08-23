export const PREDEFINED_AUTO_REFRESH_VALUES = [0, 30, 60, 120, 300, 600] as const;
export const MIN_CUSTOM_AUTO_REFRESH_SECONDS = 10;
export const DEFAULT_CUSTOM_AUTO_REFRESH_SECONDS = 60;

export function isPredefinedAutoRefreshValue(value: number): boolean {
  return (PREDEFINED_AUTO_REFRESH_VALUES as readonly number[]).includes(value);
}

export function resolveAutoRefreshSelection(selected: number, currentInterval: number): {
  custom: boolean;
  interval: number;
} {
  if (selected === -1) {
    return {
      custom: true,
      interval: currentInterval > 0 ? currentInterval : DEFAULT_CUSTOM_AUTO_REFRESH_SECONDS,
    };
  }
  return { custom: false, interval: selected };
}

export function acceptCustomRefreshInput(raw: string): boolean {
  return raw === '' || /^\d+$/.test(raw);
}

export function intervalFromCustomRefreshInput(raw: string): number | null {
  const num = parseInt(raw, 10);
  if (Number.isNaN(num) || num < MIN_CUSTOM_AUTO_REFRESH_SECONDS) return null;
  return num;
}

export function normalizeCustomRefreshBlur(raw: string): { display: string; interval: number } {
  const num = parseInt(raw, 10);
  if (Number.isNaN(num) || num < MIN_CUSTOM_AUTO_REFRESH_SECONDS) {
    return {
      display: String(MIN_CUSTOM_AUTO_REFRESH_SECONDS),
      interval: MIN_CUSTOM_AUTO_REFRESH_SECONDS,
    };
  }
  const interval = Math.floor(num);
  return { display: String(interval), interval };
}
