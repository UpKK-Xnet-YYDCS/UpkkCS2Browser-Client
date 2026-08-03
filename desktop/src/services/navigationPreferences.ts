export type NavigationLabelMode = 'icons' | 'labels';

export const NAVIGATION_LABEL_MODE_KEY = 'xproj-navigation-label-mode';
export const DEFAULT_NAVIGATION_LABEL_MODE: NavigationLabelMode = 'labels';

type NavigationPreferenceListener = () => void;

const listeners = new Set<NavigationPreferenceListener>();
let currentMode = readStoredMode();

export function normalizeNavigationLabelMode(value: string | null): NavigationLabelMode {
  return value === 'labels' ? 'labels' : DEFAULT_NAVIGATION_LABEL_MODE;
}

function readStoredMode(): NavigationLabelMode {
  try {
    return normalizeNavigationLabelMode(
      typeof window === 'undefined' ? null : window.localStorage.getItem(NAVIGATION_LABEL_MODE_KEY),
    );
  } catch {
    return DEFAULT_NAVIGATION_LABEL_MODE;
  }
}

export function getNavigationLabelMode(): NavigationLabelMode {
  return currentMode;
}

export function setNavigationLabelMode(mode: NavigationLabelMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  try {
    window.localStorage.setItem(NAVIGATION_LABEL_MODE_KEY, mode);
  } catch {
    // The preference remains available for this session when storage is unavailable.
  }
  listeners.forEach(listener => listener());
}

export function subscribeNavigationLabelMode(listener: NavigationPreferenceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
