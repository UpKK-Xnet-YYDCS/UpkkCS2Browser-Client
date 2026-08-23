import type { ColorRegion, ColorRegions, RGBAColor, ThemeSettings } from './themeTypes';

export const THEME_STORAGE_KEY = 'upkk-theme-settings';

export const defaultLightColors: ColorRegions = {
  primary: { r: 139, g: 92, b: 246, a: 1 },
  secondary: { r: 236, g: 72, b: 153, a: 1 },
  header: { r: 255, g: 255, b: 255, a: 0.9 },
  sidebar: { r: 255, g: 255, b: 255, a: 0.8 },
  background: { r: 249, g: 250, b: 251, a: 1 },
  text: { r: 17, g: 24, b: 39, a: 1 },
  accent: { r: 59, g: 130, b: 246, a: 1 },
};

export const defaultDarkColors: ColorRegions = {
  primary: { r: 139, g: 92, b: 246, a: 1 },
  secondary: { r: 236, g: 72, b: 153, a: 1 },
  header: { r: 31, g: 41, b: 55, a: 0.9 },
  sidebar: { r: 31, g: 41, b: 55, a: 0.8 },
  background: { r: 17, g: 24, b: 39, a: 1 },
  text: { r: 255, g: 255, b: 255, a: 1 },
  accent: { r: 59, g: 130, b: 246, a: 1 },
};

export const defaultTheme: ThemeSettings = {
  darkMode: true,
  colorRegions: defaultDarkColors,
  backgroundImage: '',
  backgroundOpacity: 100,
  glassEffect: false,
};

export function defaultColorsForMode(darkMode: boolean): ColorRegions {
  return darkMode ? defaultDarkColors : defaultLightColors;
}

export function applyModeSurfaceColors(colorRegions: ColorRegions, darkMode: boolean): ColorRegions {
  const defaults = defaultColorsForMode(darkMode);
  return {
    ...colorRegions,
    header: defaults.header,
    sidebar: defaults.sidebar,
    background: defaults.background,
    text: defaults.text,
  };
}

export function createResetTheme(prefersDark: boolean): ThemeSettings {
  return {
    ...defaultTheme,
    colorRegions: defaultColorsForMode(prefersDark),
  };
}

export function loadThemeSettings(raw: string | null): ThemeSettings {
  if (!raw) return defaultTheme;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeSettings> & { colorRegions?: Partial<ColorRegions> };
    const isDark = parsed.darkMode !== undefined ? parsed.darkMode : true;
    return {
      ...defaultTheme,
      ...parsed,
      colorRegions: {
        ...defaultColorsForMode(isDark),
        ...(parsed.colorRegions || {}),
      },
    };
  } catch (error) {
    console.error('Failed to load theme settings:', error);
    return defaultTheme;
  }
}

export function readStoredTheme(): ThemeSettings {
  try {
    return loadThemeSettings(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (error) {
    console.error('Failed to load theme settings:', error);
    return defaultTheme;
  }
}

export function persistThemeSettings(theme: ThemeSettings): void {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function resetColorRegionValue(darkMode: boolean, region: ColorRegion): RGBAColor {
  return defaultColorsForMode(darkMode)[region];
}
