import { useState, useEffect, type ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import { rgbaToCss } from './themeUtils';

// RGBA color type
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Color region names
export type ColorRegion = 
  | 'primary'      // 主色调 - buttons, links, active states
  | 'secondary'    // 辅助色 - secondary buttons, badges
  | 'header'       // 顶部栏背景
  | 'sidebar'      // 侧边栏/卡片背景
  | 'background'   // 页面背景
  | 'text'         // 文字颜色
  | 'accent';      // 强调色 - gradients, highlights

// Color regions configuration
export interface ColorRegions {
  primary: RGBAColor;
  secondary: RGBAColor;
  header: RGBAColor;
  sidebar: RGBAColor;
  background: RGBAColor;
  text: RGBAColor;
  accent: RGBAColor;
}

// Theme settings interface
export interface ThemeSettings {
  darkMode: boolean;
  colorRegions: ColorRegions;
  backgroundImage: string;
  backgroundOpacity: number;
  glassEffect: boolean;
}

// Default color regions for light mode
const defaultLightColors: ColorRegions = {
  primary: { r: 139, g: 92, b: 246, a: 1 },      // Purple
  secondary: { r: 236, g: 72, b: 153, a: 1 },    // Pink
  header: { r: 255, g: 255, b: 255, a: 0.9 },    // White semi-transparent
  sidebar: { r: 255, g: 255, b: 255, a: 0.8 },   // White semi-transparent
  background: { r: 249, g: 250, b: 251, a: 1 },  // Light gray
  text: { r: 17, g: 24, b: 39, a: 1 },           // Dark gray
  accent: { r: 59, g: 130, b: 246, a: 1 },       // Blue
};

// Default color regions for dark mode
const defaultDarkColors: ColorRegions = {
  primary: { r: 139, g: 92, b: 246, a: 1 },      // Purple
  secondary: { r: 236, g: 72, b: 153, a: 1 },    // Pink
  header: { r: 31, g: 41, b: 55, a: 0.9 },       // Dark gray semi-transparent
  sidebar: { r: 31, g: 41, b: 55, a: 0.8 },      // Dark gray semi-transparent
  background: { r: 17, g: 24, b: 39, a: 1 },     // Very dark
  text: { r: 255, g: 255, b: 255, a: 1 },        // White
  accent: { r: 59, g: 130, b: 246, a: 1 },       // Blue
};

// Default theme settings - dark mode by default
const defaultTheme: ThemeSettings = {
  darkMode: true,
  colorRegions: defaultDarkColors,
  backgroundImage: '',
  backgroundOpacity: 100,
  glassEffect: false,
};

// Load persisted theme
const loadTheme = (): ThemeSettings => {
  try {
    const stored = localStorage.getItem('upkk-theme-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      // Use dark colors if darkMode is true, light colors if false
      const isDark = parsed.darkMode !== undefined ? parsed.darkMode : true;
      const defaultColors = isDark ? defaultDarkColors : defaultLightColors;
      return {
        ...defaultTheme,
        ...parsed,
        colorRegions: {
          ...defaultColors,
          ...(parsed.colorRegions || {}),
        },
      };
    }
  } catch (e) {
    console.error('Failed to load theme settings:', e);
  }
  return defaultTheme;
};

// Theme context
export interface ThemeContextType extends ThemeSettings {
  setDarkMode: (enabled: boolean) => void;
  setColorRegion: (region: ColorRegion, color: RGBAColor) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setGlassEffect: (enabled: boolean) => void;
  resetTheme: () => void;
  resetColorRegion: (region: ColorRegion) => void;
  // Helper to get CSS color for a region
  getRegionColor: (region: ColorRegion) => string;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(loadTheme);

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem('upkk-theme-settings', JSON.stringify(theme));
  }, [theme]);

  // Apply dark mode to document
  useEffect(() => {
    if (theme.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme.darkMode]);

  // Apply color regions as CSS variables
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
      // Optionally update color regions to match mode
      colorRegions: enabled ? {
        ...prev.colorRegions,
        header: defaultDarkColors.header,
        sidebar: defaultDarkColors.sidebar,
        background: defaultDarkColors.background,
        text: defaultDarkColors.text,
      } : {
        ...prev.colorRegions,
        header: defaultLightColors.header,
        sidebar: defaultLightColors.sidebar,
        background: defaultLightColors.background,
        text: defaultLightColors.text,
      },
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
    const defaultColors = window.matchMedia('(prefers-color-scheme: dark)').matches ? defaultDarkColors : defaultLightColors;
    setTheme({
      ...defaultTheme,
      colorRegions: defaultColors,
    });
  };

  const resetColorRegion = (region: ColorRegion) => {
    const defaults = theme.darkMode ? defaultDarkColors : defaultLightColors;
    setColorRegion(region, defaults[region]);
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
