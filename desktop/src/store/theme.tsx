import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// RGBA color type
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Convert RGBA to CSS string
export const rgbaToCss = (color: RGBAColor): string => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};

// Convert hex to RGBA
export const hexToRgba = (hex: string, alpha: number = 1): RGBAColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: alpha,
    };
  }
  return { r: 139, g: 92, b: 246, a: 1 }; // Default purple
};

// Convert RGBA to hex (ignoring alpha)
export const rgbaToHex = (color: RGBAColor): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

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

// Region labels for UI
export const colorRegionLabels: Record<ColorRegion, string> = {
  primary: '主色调',
  secondary: '辅助色',
  header: '顶部栏',
  sidebar: '卡片背景',
  background: '页面背景',
  text: '文字颜色',
  accent: '强调色',
};

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

// Available preset colors
export const presetColors = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
  { name: '绿色', value: '#10b981' },
  { name: '橙色', value: '#f97316' },
  { name: '红色', value: '#ef4444' },
  { name: '青色', value: '#06b6d4' },
  { name: '黄色', value: '#eab308' },
  { name: '靛蓝', value: '#6366f1' },
  { name: '白色', value: '#ffffff' },
  { name: '黑色', value: '#000000' },
  { name: '灰色', value: '#6b7280' },
];

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
interface ThemeContextType extends ThemeSettings {
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

const ThemeContext = createContext<ThemeContextType | null>(null);

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

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
