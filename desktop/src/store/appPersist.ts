import type { ViewMode } from '@/types/ui';
import type { GameType, ServerRegion } from '@/types';

export const APP_STATE_STORAGE_KEY = 'xproj-desktop-state';

export const CARD_MIN_WIDTH_DEFAULT = 320;
export const CARD_MIN_WIDTH_MIN = 260;
export const CARD_MIN_WIDTH_MAX = 460;
export const CARD_MIN_WIDTH_STEP = 20;

export interface PersistedAppState {
  favorites: string[];
  apiBaseUrl: string;
  selectedRegion: ServerRegion;
  selectedGameType: GameType;
  selectedContinent: string;
  selectedGeoRegion: string;
  selectedCountry: string;
  viewMode: ViewMode;
  perPage: number;
  cardMinWidth: number;
}

export function clampCardMinWidth(value: unknown): number {
  const width = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(width)) return CARD_MIN_WIDTH_DEFAULT;
  const stepped = Math.round(width / CARD_MIN_WIDTH_STEP) * CARD_MIN_WIDTH_STEP;
  return Math.min(CARD_MIN_WIDTH_MAX, Math.max(CARD_MIN_WIDTH_MIN, stepped));
}

export function serializePersistedAppState(state: PersistedAppState): PersistedAppState {
  return {
    favorites: state.favorites,
    apiBaseUrl: state.apiBaseUrl,
    selectedRegion: state.selectedRegion,
    selectedGameType: state.selectedGameType,
    selectedContinent: state.selectedContinent,
    selectedGeoRegion: state.selectedGeoRegion,
    selectedCountry: state.selectedCountry,
    viewMode: state.viewMode,
    perPage: state.perPage,
    cardMinWidth: state.cardMinWidth,
  };
}

export function persistAppState(state: PersistedAppState): void {
  localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(serializePersistedAppState(state)));
}

export function parsePersistedAppState(parsed: Partial<PersistedAppState> | null | undefined): PersistedAppState {
  return {
    favorites: parsed?.favorites || [],
    apiBaseUrl: parsed?.apiBaseUrl || 'https://servers.upkk.com',
    selectedRegion: parsed?.selectedRegion || 'all',
    selectedGameType: parsed?.selectedGameType || 'cs2',
    selectedContinent: parsed?.selectedContinent || 'all',
    selectedGeoRegion: parsed?.selectedGeoRegion || 'all',
    selectedCountry: parsed?.selectedCountry || 'all',
    viewMode: parsed?.viewMode || 'card',
    perPage: parsed?.perPage || 20,
    cardMinWidth: clampCardMinWidth(parsed?.cardMinWidth),
  };
}

export function loadPersistedState(): Partial<PersistedAppState> {
  try {
    const stored = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (stored) {
      return parsePersistedAppState(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Failed to load persisted state:', e);
  }
  return {};
}
