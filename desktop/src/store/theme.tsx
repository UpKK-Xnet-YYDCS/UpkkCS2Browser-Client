import { useState, useEffect, type ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import { rgbaToCss } from './themeUtils';
import {
  applyModeSurfaceColors,
  createResetTheme,
  persistThemeSettings,
  readStoredTheme,
  resetColorRegionValue,
} from './themePersist';
import type { ColorRegion, RGBAColor, ThemeContextType, ThemeSettings } from './themeTypes';

export type {
  ColorRegion,
  ColorRegions,
  RGBAColor,
  ThemeContextType,
  ThemeSettings,
} from './themeTypes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(readStoredTheme);

  useEffect(() => {
    persistThemeSettings(theme);
  }, [theme]);

  useEffect(() => {
    if (theme.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme.darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colorRegions).forEach(([region, color]) => {
      root.style.setProperty(`--color-${region}`, rgbaToCss(color));
      root.style.setProperty(`--color-${region}-rgb`, `${color.r}, ${color.g}, ${color.b}`);
    });
  }, [theme.colorRegions]);

  const setDarkMode = (enabled: boolean) => {
    setTheme(prev => ({
      ...prev,
      darkMode: enabled,
      colorRegions: applyModeSurfaceColors(prev.colorRegions, enabled),
    }));
  };

  const setColorRegion = (region: ColorRegion, color: RGBAColor) => {
    setTheme(prev => ({
      ...prev,
      colorRegions: {
        ...prev.colorRegions,
        [region]: color,
      },
    }));
  };

  const setBackgroundImage = (url: string) => {
    setTheme(prev => ({ ...prev, backgroundImage: url }));
  };

  const setBackgroundOpacity = (opacity: number) => {
    setTheme(prev => ({ ...prev, backgroundOpacity: opacity }));
  };

  const setGlassEffect = (enabled: boolean) => {
    setTheme(prev => ({ ...prev, glassEffect: enabled }));
  };

  const resetTheme = () => {
    setTheme(createResetTheme(window.matchMedia('(prefers-color-scheme: dark)').matches));
  };

  const resetColorRegion = (region: ColorRegion) => {
    setColorRegion(region, resetColorRegionValue(theme.darkMode, region));
  };

  const getRegionColor = (region: ColorRegion): string => {
    return rgbaToCss(theme.colorRegions[region]);
  };

  const value: ThemeContextType = {
    ...theme,
    setDarkMode,
    setColorRegion,
    setBackgroundImage,
    setBackgroundOpacity,
    setGlassEffect,
    resetTheme,
    resetColorRegion,
    getRegionColor,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
